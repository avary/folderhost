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

func (sm *ServiceManager) GetServiceRAMUsage(name string) (int64, error) {
	sm.Mu.RLock()
	service, exists := sm.Services[name]
	sm.Mu.RUnlock()

	if !exists {
		return 0, fmt.Errorf("can't find service")
	}

	service.mu.RLock()
	defer service.mu.RUnlock()

	if service.Status != "running" || service.PID == 0 {
		return 0, nil
	}

	return getProcessRAM(service.PID)
}

func (sm *ServiceManager) GetServiceRAMUsageWithTree(name string) (int64, error) {
	sm.Mu.RLock()
	service, exists := sm.Services[name]
	sm.Mu.RUnlock()

	if !exists {
		return 0, fmt.Errorf("can't find service")
	}

	service.mu.RLock()
	defer service.mu.RUnlock()

	if service.Status != "running" || service.PID == 0 {
		return 0, nil
	}

	return getProcessTreeRAM(service.PID)
}

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
		cmd := exec.Command("powershell", fmt.Sprintf("(Get-Process -Id %d).WorkingSet", pid))
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

	if runtime.GOOS == "windows" {
		cmd := exec.Command("wmic", "process", "where", fmt.Sprintf("ParentProcessId=%d", pid), "get", "ProcessId")
		out, _ := cmd.Output()
		for _, line := range strings.Split(string(out), "\n")[1:] {
			p, _ := strconv.Atoi(strings.TrimSpace(line))
			if p > 0 {
				children = append(children, p)
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

	// log.Printf("RAM watching started: %s (Soft: %d%%, Hard: %d%%)",
	// 	name, 80, 100)

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

			// if usage > limiter.SoftLimit {
			// 	log.Printf("Warning: %s RAM limit warning: %s / %s (Soft Limit: %s)",
			// 		name,
			// 		utils.ConvertBytesToString(usage),
			// 		service.Config.RAM,
			// 		utils.ConvertBytesToString(limiter.SoftLimit))
			// }

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
