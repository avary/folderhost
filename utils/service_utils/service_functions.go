package serviceutils

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"syscall"

	"github.com/MertJSX/folderhost/utils"
	"github.com/gofiber/fiber/v2"
)

var GlobalServiceManager *ServiceManager

func NewServiceManager() *ServiceManager {
	ctx, cancel := context.WithCancel(context.Background())

	workingDir, err := os.Getwd()
	if err != nil {
		log.Printf("Warning: Can't get workdir: %v", err)
	}

	return &ServiceManager{
		Services:   make(map[string]*ManagedService),
		Ctx:        ctx,
		Cancel:     cancel,
		WorkingDir: workingDir,
	}
}

func KillProcess(pid int) error {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("taskkill", "/F", "/T", "/PID", strconv.Itoa(pid))
		return cmd.Run()
	} else {
		process, err := os.FindProcess(pid)
		if err != nil {
			return err
		}
		return process.Signal(os.Kill)
	}
}

func TerminateProcess(pid int) error {
	if runtime.GOOS == "windows" {
		cmd := exec.Command("taskkill", "/PID", strconv.Itoa(pid))
		return cmd.Run()
	} else {
		process, err := os.FindProcess(pid)
		if err != nil {
			return err
		}
		return process.Signal(syscall.SIGTERM)
	}
}

var ansiColorRegex = regexp.MustCompile(`\x1b\[[0-9;]*m`)

var ansiEscapeRegex = regexp.MustCompile(
	`\x1b\[[0-9;]*[ABCDEFGHJKLMPSTfhilnrsu]` +
		`|\x1b\][^\x07\x1b]*[\x07\x1b]` +
		`|\][0-9]+;[^\\\n]*\\` +
		`|\[\?[0-9]+[hl]`,
)

func stripControlSequences(s string) string {
	colors := ansiColorRegex.FindAllString(s, -1)
	placeholders := make([]string, len(colors))
	for i, c := range colors {
		placeholders[i] = fmt.Sprintf("\x00COLOR%d\x00", i)
		s = strings.Replace(s, c, placeholders[i], 1)
	}

	s = ansiEscapeRegex.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "\x1b", "")

	for i, p := range placeholders {
		s = strings.Replace(s, p, colors[i], 1)
	}

	return s
}

func (lb *LogBuffer) Write(p []byte) (n int, err error) {
	lb.mu.Lock()

	content := string(p)

	if lb.UsePTY {
		content = stripControlSequences(content)
	}

	content = strings.ReplaceAll(content, "\r\n", "\n")

	if !strings.Contains(content, "\n") && strings.Contains(content, "\r") {
		parts := strings.Split(content, "\r")
		content = parts[len(parts)-1]
	} else {
		content = strings.ReplaceAll(content, "\r", "\n")
	}

	lines := strings.Split(content, "\n")

	var toSend []string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || line == "\\" || line == "\\\\" {
			continue
		}

		trimmed := strings.Trim(line, "\\")
		if trimmed == "" {
			continue
		}

		if len(lb.Lines) >= lb.MaxLines {
			lb.Lines = lb.Lines[1:]
		}

		lb.Lines = append(lb.Lines, line)
		toSend = append(toSend, line)
	}

	serviceName := lb.ServiceName
	lb.mu.Unlock()

	for _, line := range toSend {
		NewServiceLog(serviceName, line)
	}

	return len(p), nil
}

func NewServiceLog(serviceName string, logStr string) {
	newLog, err := json.Marshal(fiber.Map{
		"type":        "new-log",
		"data":        logStr,
		"serviceName": serviceName,
	})

	if err == nil {
		utils.SendToAll(fmt.Sprintf("!service-%s", serviceName), 1, newLog)
	}
}

func (lb *LogBuffer) GetLines() []string {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	result := make([]string, len(lb.Lines))
	copy(result, lb.Lines)
	return result
}

func (lb *LogBuffer) Clear() {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	lb.Lines = make([]string, 0)
}
