package serviceutils

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/MertJSX/folderhost/utils"
)

func getProcessRAM(pid int) (int64, error) {
	switch runtime.GOOS {
	case "linux":
		data, err := os.ReadFile(fmt.Sprintf("/proc/%d/statm", pid))
		if err != nil {
			return 0, err
		}
		fields := strings.Fields(string(data))
		if len(fields) < 2 {
			return 0, fmt.Errorf("invalid statm")
		}
		rss, _ := strconv.ParseInt(fields[1], 10, 64)
		return rss * int64(os.Getpagesize()), nil

	case "windows":
		cmd := exec.Command("powershell", "-Command", fmt.Sprintf(`
			$total = 0
			$pids = [System.Collections.Generic.Queue[int]]::new()
			$pids.Enqueue(%d)
			$visited = @{}
			while ($pids.Count -gt 0) {
				$current = $pids.Dequeue()
				if ($visited[$current]) { continue }
				$visited[$current] = $true
				try {
					$p = Get-Process -Id $current -ErrorAction Stop
					$total += $p.WorkingSet64
					Get-CimInstance Win32_Process -Filter "ParentProcessId=$current" | ForEach-Object { $pids.Enqueue($_.ProcessId) }
				} catch {}
			}
			$total
		`, pid))
		out, _ := cmd.Output()
		return strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64)

	case "darwin":
		cmd := exec.Command("ps", "-o", "rss=", "-p", strconv.Itoa(pid))
		out, _ := cmd.Output()
		rss, _ := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64)
		return rss * 1024, nil

	default:
		return 0, fmt.Errorf("unsupported platform")
	}
}

func getProcessTreeRAM(pid int) (int64, error) {
	switch runtime.GOOS {
	case "windows":
		return getProcessRAM(pid)

	default:
		var total int64
		visited := make(map[int]bool)

		var walk func(int)
		walk = func(p int) {
			if visited[p] {
				return
			}
			visited[p] = true

			if ram, err := getProcessRAM(p); err == nil {
				total += ram
			}

			for _, child := range getChildPIDs(p) {
				walk(child)
			}
		}

		walk(pid)
		return total, nil
	}
}

func getChildPIDs(pid int) []int {
	var children []int

	if runtime.GOOS == "linux" {
		files, _ := os.ReadDir("/proc")
		for _, f := range files {
			if !f.IsDir() {
				continue
			}
			p, err := strconv.Atoi(f.Name())
			if err != nil {
				continue
			}

			data, _ := os.ReadFile(fmt.Sprintf("/proc/%d/status", p))
			for _, line := range strings.Split(string(data), "\n") {
				if strings.HasPrefix(line, "PPid:") {
					fields := strings.Fields(line)
					if len(fields) >= 2 {
						ppid, _ := strconv.Atoi(fields[1])
						if ppid == pid {
							children = append(children, p)
						}
					}
					break
				}
			}
		}
	}

	if runtime.GOOS == "darwin" {
		cmd := exec.Command("pgrep", "-P", strconv.Itoa(pid))
		out, _ := cmd.Output()
		for _, line := range strings.Split(string(out), "\n") {
			p, _ := strconv.Atoi(strings.TrimSpace(line))
			if p > 0 {
				children = append(children, p)
			}
		}
	}

	return children
}

func (sm *ServiceManager) GetAllServicesRAM() map[string]int64 {
	sm.Mu.RLock()
	defer sm.Mu.RUnlock()

	result := make(map[string]int64)
	for name, s := range sm.Services {
		s.mu.RLock()
		if s.Status == "running" && s.PID > 0 {
			ram, _ := getProcessTreeRAM(s.PID)
			result[name] = ram
		}
		s.mu.RUnlock()
	}
	return result
}

func (sm *ServiceManager) StartMonitoring(name string) {
	sm.Mu.RLock()
	service, exists := sm.Services[name]
	sm.Mu.RUnlock()

	if !exists {
		return
	}

	limiter := &SoftLimiter{
		PID:       service.PID,
		SoftLimit: int64(float64(service.Config.RAMBytes) * 0.8),
		HardLimit: service.Config.RAMBytes,
	}

	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			service.mu.RLock()
			if service.Status != "running" {
				service.mu.RUnlock()
				return
			}
			service.mu.RUnlock()

			usage, err := getProcessTreeRAM(limiter.PID)
			if err != nil {
				log.Printf("Error checking RAM usage of service: %s", name)
				continue
			}

			if usage > limiter.HardLimit {
				log.Printf("Stopping Service: %s RAM Limit Exceeded! Usage: %s / Limit: %s",
					name,
					utils.ConvertBytesToString(usage),
					service.Config.RAM)

				go sm.StopService(name)
				return
			}
		}
	}()
}
