//go:build linux || darwin || freebsd
// +build linux darwin freebsd

package serviceutils

import (
	"os"
	"os/exec"
	"syscall"
)

func setProcessAttributes(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true,
	}
}

func killProcessTree(pid int) error {
	pgid, err := syscall.Getpgid(pid)
	if err == nil {
		if err := syscall.Kill(-pgid, syscall.SIGKILL); err == nil {
			return nil
		}
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	return process.Kill()
}
