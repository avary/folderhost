//go:build windows
// +build windows

package serviceutils

import (
	"os/exec"
	"strconv"
)

func setProcessAttributes(cmd *exec.Cmd) {
	// Windows does not require custom process group attributes.
}

func killProcessTree(pid int) error {
	cmd := exec.Command("taskkill", "/F", "/T", "/PID", strconv.Itoa(pid))
	return cmd.Run()
}
