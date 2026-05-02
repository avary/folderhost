package routes

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/MertJSX/folderhost/database/logs"
	"github.com/MertJSX/folderhost/types"
	"github.com/MertJSX/folderhost/utils"
	"github.com/MertJSX/folderhost/utils/config"
	"github.com/gofiber/fiber/v2"
)

func ChunkedUpload(c *fiber.Ctx) error {
	if !c.Locals("account").(types.Account).Permissions.UploadFiles {
		return c.Status(403).JSON(fiber.Map{"err": "No permission!"})
	}

	config := &config.Config
	targetPath := c.Query("path")
	scope := c.Locals("account").(types.Account).Scope

	if targetPath == "" {
		return c.Status(400).JSON(fiber.Map{"err": "Missing path query"})
	}

	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(500).SendString("Couldn't read form: " + err.Error())
	}
	defer form.RemoveAll()

	files := form.File["files"]
	if len(files) > 1 {
		return handleMultipleUpload(c, files, targetPath, scope)
	}
	if len(files) == 1 {
		return handleSingleFileFromMultiple(c, files[0], targetPath, scope)
	}

	fileID := c.FormValue("fileID")
	chunkIndex := c.FormValue("chunkIndex")
	totalChunks := c.FormValue("totalChunks")
	fileName := c.FormValue("fileName")
	total, _ := strconv.ParseInt(totalChunks, 10, 64)
	currentChunk, _ := strconv.Atoi(chunkIndex)

	if total == 1 {
		file, err := form.File["file"][0].Open()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"err": "Couldn't open file"})
		}
		defer file.Close()

		finalPath := filepath.Join(config.GetScopedFolder(scope), targetPath, fileName)
		outFile, err := os.Create(finalPath)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"err": "Couldn't create file"})
		}
		defer outFile.Close()

		if _, err := io.Copy(outFile, file); err != nil {
			return c.Status(500).JSON(fiber.Map{"err": "Couldn't save file"})
		}

		logs.CreateLog(types.AuditLog{
			Username:    c.Locals("account").(types.Account).Username,
			Action:      "Upload",
			Description: fmt.Sprintf("%s uploaded a %s file.", c.Locals("account").(types.Account).Username, fileName),
		})

		return c.JSON(fiber.Map{
			"response": "Successfully uploaded!",
			"uploaded": true,
		})
	}

	chunkPath := filepath.Join("./tmp", fileID+"_"+chunkIndex)
	chunkFile, err := form.File["file"][0].Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"err": "Couldn't open chunk"})
	}
	defer chunkFile.Close()

	outFile, err := os.Create(chunkPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"err": "Couldn't create chunk file"})
	}
	defer outFile.Close()

	chunkContent, _ := utils.FileToString(chunkFile)

	ch := make(chan error, 1)
	var wg sync.WaitGroup

	wg.Add(1)
	go utils.CreateFileAsync(chunkPath, chunkContent, &wg, ch)

	go func() {
		wg.Wait()
		close(ch)
	}()

	err = <-ch

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"err": "Couldn't save chunk"})
	}

	if currentChunk == int(total)-1 {
		finalPath := filepath.Join(config.GetScopedFolder(scope), targetPath, fileName)
		if err := mergeChunks(fileID, finalPath, int(total)); err != nil {
			return c.Status(500).JSON(fiber.Map{"err": "Error uploading file"})
		}

		logs.CreateLog(types.AuditLog{
			Username:    c.Locals("account").(types.Account).Username,
			Action:      "Upload",
			Description: fmt.Sprintf("%s uploaded a %s file.", c.Locals("account").(types.Account).Username, fileName),
		})

		return c.JSON(fiber.Map{
			"response": "Successfully uploaded!",
			"uploaded": true,
		})
	}

	return c.JSON(fiber.Map{
		"response": fmt.Sprintf("Uploaded chunk %s", chunkIndex),
	})
}

func handleMultipleUpload(c *fiber.Ctx, files []*multipart.FileHeader, targetPath, scope string) error {
	config := &config.Config

	type uploadResult struct {
		FileName string `json:"fileName"`
		Status   string `json:"status"`
		Error    string `json:"error,omitempty"`
	}

	results := make([]uploadResult, len(files))
	var wg sync.WaitGroup
	successCount := 0

	for i, fileHeader := range files {
		wg.Add(1)
		go func(idx int, fh *multipart.FileHeader) {
			defer wg.Done()

			file, err := fh.Open()
			if err != nil {
				results[idx] = uploadResult{FileName: fh.Filename, Status: "failed", Error: "Couldn't open file"}
				return
			}
			defer file.Close()

			finalPath := filepath.Join(config.GetScopedFolder(scope), targetPath, fh.Filename)

			if err := os.MkdirAll(filepath.Dir(finalPath), 0755); err != nil {
				results[idx] = uploadResult{FileName: fh.Filename, Status: "failed", Error: "Couldn't create directory"}
				return
			}

			outFile, err := os.Create(finalPath)
			if err != nil {
				results[idx] = uploadResult{FileName: fh.Filename, Status: "failed", Error: "Couldn't create file"}
				return
			}
			defer outFile.Close()

			if _, err := io.Copy(outFile, file); err != nil {
				results[idx] = uploadResult{FileName: fh.Filename, Status: "failed", Error: "Couldn't save file"}
				return
			}

			results[idx] = uploadResult{FileName: fh.Filename, Status: "success"}
			successCount++
		}(i, fileHeader)
	}

	wg.Wait()

	if successCount > 0 {
		logs.CreateLog(types.AuditLog{
			Username:    c.Locals("account").(types.Account).Username,
			Action:      "Upload",
			Description: fmt.Sprintf("%s uploaded %d file(s)", c.Locals("account").(types.Account).Username, successCount),
		})
	}

	return c.JSON(fiber.Map{
		"response": fmt.Sprintf("Successfully uploaded %d file(s)", successCount),
		"uploaded": true,
		"multiple": true,
		"results":  results,
		"success":  successCount,
		"failed":   len(files) - successCount,
	})
}

func handleSingleFileFromMultiple(c *fiber.Ctx, fileHeader *multipart.FileHeader, targetPath, scope string) error {
	config := &config.Config

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"err": "Couldn't open file"})
	}
	defer file.Close()

	finalPath := filepath.Join(config.GetScopedFolder(scope), targetPath, fileHeader.Filename)

	if err := os.MkdirAll(filepath.Dir(finalPath), 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"err": "Couldn't create directory"})
	}

	outFile, err := os.Create(finalPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"err": "Couldn't create file"})
	}
	defer outFile.Close()

	if _, err := io.Copy(outFile, file); err != nil {
		return c.Status(500).JSON(fiber.Map{"err": "Couldn't save file"})
	}

	logs.CreateLog(types.AuditLog{
		Username:    c.Locals("account").(types.Account).Username,
		Action:      "Upload",
		Description: fmt.Sprintf("%s uploaded a %s file.", c.Locals("account").(types.Account).Username, fileHeader.Filename),
	})

	return c.JSON(fiber.Map{
		"response": "Successfully uploaded!",
		"uploaded": true,
	})
}

func mergeChunks(fileID, outputPath string, totalChunks int) error {
	outFile, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	for i := 0; i < totalChunks; i++ {
		chunkPath := filepath.Join("./tmp", fmt.Sprintf("%s_%d", fileID, i))
		chunkData, err := os.Open(chunkPath)
		if err != nil {
			return fmt.Errorf("couldn't find chunk %d: %v", i, err)
		}

		if _, err := io.Copy(outFile, chunkData); err != nil {
			chunkData.Close()
			return fmt.Errorf("couldn't write chunk %d: %v", i, err)
		}
		chunkData.Close()
		os.Remove(chunkPath)
	}
	return nil
}
