package serviceutils

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"syscall"
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

type ProcessKiller struct {
	pid int
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

func killProcessTree(pid int) error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("taskkill", "/F", "/T", "/PID", strconv.Itoa(pid))
		return cmd.Run()
	case "linux", "darwin":
		pgid, err := syscall.Getpgid(pid)
		if err != nil {
			process, err := os.FindProcess(pid)
			if err != nil {
				return err
			}
			return process.Kill()
		}
		return syscall.Kill(-pgid, syscall.SIGKILL)
	default:
		return fmt.Errorf("unsupported platform")
	}
}

func (lb *LogBuffer) Write(p []byte) (n int, err error) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	content := string(p)
	lines := strings.Split(content, "\n")

	for _, line := range lines {
		if line == "" {
			continue
		}

		if len(lb.Lines) >= lb.MaxLines {
			lb.Lines = lb.Lines[1:]
		}

		lb.Lines = append(lb.Lines, line)
	}

	return len(p), nil
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
