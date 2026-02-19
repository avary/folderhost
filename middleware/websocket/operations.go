package websocket

import (
	"encoding/json"
	"fmt"

	"github.com/MertJSX/folderhost/types"
	"github.com/MertJSX/folderhost/utils"
	"github.com/MertJSX/folderhost/utils/config"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func HandleUnzip(c *websocket.Conn, mt int, message types.EditorChange) {
	var account types.Account = c.Locals("account").(types.Account)

	src := config.Config.GetScopedFolder(account.Scope) + message.Path
	dest := fmt.Sprintf("%s%s/%s", config.Config.GetScopedFolder(account.Scope), utils.GetParentPath(message.Path), utils.GetPureFileName(message.Path))

	for index := 1; utils.IsExistingPath(dest); index++ {
		dest = fmt.Sprintf("%s (%d)", dest, index)
	}

	utils.Unzip(src, dest, func(totalSize int64, isCompleted bool, abortMsg string) {
		unzipProgress, _ := json.Marshal(fiber.Map{
			"type":        "unzip-progress",
			"totalSize":   utils.ConvertBytesToString(totalSize),
			"isCompleted": isCompleted,
			"abortMsg":    abortMsg,
		})

		c.WriteMessage(mt, unzipProgress)
	})
}

func HandleZip(c *websocket.Conn, mt int, message types.EditorChange) {
	var account types.Account = c.Locals("account").(types.Account)

	src := config.Config.GetScopedFolder(account.Scope) + message.Path
	baseDest := fmt.Sprintf("%s%s/%s", config.Config.GetScopedFolder(account.Scope), utils.GetParentPath(message.Path), utils.GetPureFileName(message.Path))
	dest := baseDest + ".zip"

	for index := 1; utils.IsExistingPath(dest); index++ {
		dest = fmt.Sprintf("%s (%d).zip", baseDest, index)
	}

	utils.Zip(src, dest, func(totalSize int64, isCompleted bool, abortMsg string) {
		zipProgress, _ := json.Marshal(fiber.Map{
			"type":        "zip-progress",
			"totalSize":   utils.ConvertBytesToString(totalSize),
			"isCompleted": isCompleted,
			"abortMsg":    abortMsg,
		})

		c.WriteMessage(mt, zipProgress)
	})
}
