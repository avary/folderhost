package serviceutils

import (
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/MertJSX/folderhost/utils"
	"github.com/stretchr/testify/assert/yaml"
)

func (sm *ServiceManager) LoadConfig(filename string) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("can't read services.yml file: %v", err)
	}

	err = yaml.Unmarshal(data, &sm.Config)
	if err != nil {
		return fmt.Errorf("YAML parse error: %v", err)
	}

	for _, service := range sm.Config.Services {
		ramBytes := utils.ConvertStringToBytes(service.RAM)

		service.RAMBytes = ramBytes

		sm.Services[service.Title] = &ManagedService{
			Config: service,
			Status: "stopped",
		}
		// log.Printf("Service config loaded: %s (RAM: %s)", service.Title, service.RAM)
	}

	return nil
}

func (sm *ServiceManager) GetServiceLogs(name string, lines int) ([]string, error) {
	sm.Mu.RLock()
	service, exists := sm.Services[name]
	sm.Mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("can't find service: %s", name)
	}

	service.mu.RLock()
	defer service.mu.RUnlock()

	if service.LogBuffer == nil {
		return []string{}, nil
	}

	allLines := service.LogBuffer.GetLines()

	if lines <= 0 || lines > len(allLines) {
		lines = len(allLines)
	}

	start := len(allLines) - lines
	if start < 0 {
		start = 0
	}

	result := make([]string, len(allLines[start:]))
	copy(result, allLines[start:])
	return result, nil
}

func (sm *ServiceManager) GetAllServiceLogs(name string) ([]string, error) {
	return sm.GetServiceLogs(name, 0)
}

func (sm *ServiceManager) ClearServiceLogs(name string) error {
	sm.Mu.RLock()
	service, exists := sm.Services[name]
	sm.Mu.RUnlock()

	if !exists {
		return fmt.Errorf("can't find service: %s", name)
	}

	service.mu.Lock()
	defer service.mu.Unlock()

	if service.LogBuffer != nil {
		service.LogBuffer.Clear()
		log.Printf("Cleared service logs: %s", name)
	}

	return nil
}

func (sm *ServiceManager) SendCommand(name string, command string) error {
	sm.Mu.RLock()
	service, exists := sm.Services[name]
	sm.Mu.RUnlock()

	if !exists {
		return fmt.Errorf("can't find service: %s", name)
	}

	service.mu.RLock()
	defer service.mu.RUnlock()

	if service.Status != "running" {
		return fmt.Errorf("service not working: %s", name)
	}

	if service.CMD == nil || service.CMD.Process == nil {
		return fmt.Errorf("no service process: %s", name)
	}

	if !service.Config.AllowExecutingCommands {
		return fmt.Errorf("allow_executing_commands option is disabled for this service: %s", name)
	}

	if service.Stdin == nil {
		return fmt.Errorf("stdin pipe is not available for service: %s", name)
	}

	_, err := io.WriteString(service.Stdin, command+"\n")
	if err != nil {
		return fmt.Errorf("send command error: %v", err)
	}

	return nil
}

func (sm *ServiceManager) ListServices() []ServiceStatus {
	sm.Mu.RLock()
	defer sm.Mu.RUnlock()

	var serviceStatuses []ServiceStatus
	for name, service := range sm.Services {
		service.mu.RLock()

		status := ServiceStatus{
			Name:     name,
			Status:   service.Status,
			PID:      service.PID,
			Uptime:   time.Since(service.StartTime).Round(time.Second),
			WorkDir:  service.WorkDir,
			RAM:      service.Config.RAM,
			RAMBytes: service.Config.RAMBytes,
		}

		if service.Status == "running" {
			usage, err := getProcessRAM(service.PID)
			if err == nil {
				status.RAMUsage = usage
				status.RAMUsageStr = utils.ConvertBytesToString(usage)
			} else {
				status.RAMUsage = 0
				status.RAMUsageStr = "N/A"
				// log.Printf("RAM read error %s: %v", name, err)
			}
		}

		serviceStatuses = append(serviceStatuses, status)
		service.mu.RUnlock()
	}

	return serviceStatuses
}

func (sm *ServiceManager) ListAllowedServices(username string) []ServiceStatus {
	sm.Mu.RLock()
	defer sm.Mu.RUnlock()

	var serviceStatuses []ServiceStatus = []ServiceStatus{}
	for name, service := range sm.Services {
		service.mu.RLock()

		for i, v := range service.Config.Users {
			if v.Username == username {
				break
			}
			if len(service.Config.Users)-1 == i {
				return serviceStatuses
			}
		}

		status := ServiceStatus{
			Name:     name,
			Status:   service.Status,
			PID:      service.PID,
			Uptime:   time.Since(service.StartTime).Round(time.Second),
			WorkDir:  service.WorkDir,
			RAM:      service.Config.RAM,
			RAMBytes: service.Config.RAMBytes,
		}

		if service.Status == "running" {
			usage, err := getProcessRAM(service.PID)
			if err == nil {
				status.RAMUsage = usage
				status.RAMUsageStr = utils.ConvertBytesToString(usage)
			} else {
				status.RAMUsage = 0
				status.RAMUsageStr = "N/A"
				// log.Printf("RAM read error %s: %v", name, err)
			}
		}

		serviceStatuses = append(serviceStatuses, status)
		service.mu.RUnlock()
	}

	return serviceStatuses
}

func (sm *ServiceManager) Shutdown() {
	log.Println("Stopping all services...")

	var wg sync.WaitGroup

	for name := range sm.Services {
		wg.Add(1)
		go func(serviceName string) {
			defer wg.Done()

			if err := sm.StopService(serviceName); err != nil {
				if !strings.Contains(err.Error(), "not working") {
					log.Printf("%s error while stopping: %v", serviceName, err)
				}
			}

			sm.Mu.RLock()
			service, exists := sm.Services[serviceName]
			sm.Mu.RUnlock()

			if exists && service.CMD != nil && service.CMD.Process != nil {
				if err := service.CMD.Process.Signal(syscall.Signal(0)); err == nil {
					log.Printf("Service still working, forcing to stop: %s", serviceName)
					KillProcess(service.PID)
				}
			}
		}(name)
	}

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Println("All services were stopped successfully!")
	case <-time.After(30 * time.Second):
		log.Println("Can't stop some of the services, forcing to stop...")
		sm.forceKillAll()
	}

	sm.Cancel()
}

func (sm *ServiceManager) forceKillAll() {
	sm.Mu.RLock()
	defer sm.Mu.RUnlock()

	for name, service := range sm.Services {
		if service.CMD != nil && service.CMD.Process != nil {
			log.Printf("Forcing to stop: %s (PID: %d)", name, service.PID)
			KillProcess(service.PID)
		}
	}
}

func (sm *ServiceManager) GetServiceStatus(name string) (ServiceStatus, error) {
	sm.Mu.RLock()
	service, exists := sm.Services[name]
	sm.Mu.RUnlock()

	if !exists {
		return ServiceStatus{}, fmt.Errorf("can't find service: %s", name)
	}

	service.mu.RLock()
	defer service.mu.RUnlock()

	var ramUsage int64
	if service.Status == "running" {
		ramUsage, _ = sm.GetServiceRAMUsage(name)
	}

	return ServiceStatus{
		Name:        name,
		Status:      service.Status,
		PID:         service.PID,
		StartTime:   service.StartTime,
		Uptime:      time.Since(service.StartTime),
		WorkDir:     service.WorkDir,
		RAM:         service.Config.RAM,
		RAMBytes:    service.Config.RAMBytes,
		RAMUsage:    ramUsage,
		RAMUsageStr: utils.ConvertBytesToString(ramUsage),
	}, nil
}

func (sm *ServiceManager) StartService(name string) error {
	sm.Mu.Lock()
	defer sm.Mu.Unlock()

	service, exists := sm.Services[name]
	if !exists {
		return fmt.Errorf("can't find service: %s", name)
	}

	service.mu.Lock()
	defer service.mu.Unlock()

	if service.Status == "running" {
		return fmt.Errorf("service already working: %s", name)
	}

	service.LogBuffer = &LogBuffer{
		Lines:    make([]string, 0),
		MaxLines: 200,
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(sm.Ctx, "cmd", "/C", service.Config.Script)
	} else {
		cmd = exec.CommandContext(sm.Ctx, "sh", "-c", service.Config.Script)
	}

	if service.Config.Workdir != "" {
		if !filepath.IsAbs(service.Config.Workdir) {
			absWorkdir := filepath.Join(sm.WorkingDir, service.Config.Workdir)
			cmd.Dir = absWorkdir
		} else {
			cmd.Dir = service.Config.Workdir
		}
	} else {
		cmd.Dir = sm.WorkingDir
	}

	cmd.Stdout = service.LogBuffer
	cmd.Stderr = service.LogBuffer

	if service.Config.AllowExecutingCommands {
		stdin, err := cmd.StdinPipe()

		if err != nil {
			log.Printf("can't create stdin pipe (can't execute commands): %v", err)
		} else {
			service.Stdin = stdin
		}
	}

	if runtime.GOOS != "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	}

	err := cmd.Start()
	if err != nil {
		return fmt.Errorf("can't start service: %v", err)
	}

	service.CMD = cmd
	service.Status = "running"
	service.StartTime = time.Now()
	service.PID = cmd.Process.Pid
	service.WorkDir = cmd.Dir

	if service.Config.RAMBytes > 0 {
		log.Printf("Service started: %s (PID: %d) - RAM: %s", name, cmd.Process.Pid, service.Config.RAM)
	} else {
		log.Printf("Service started: %s (PID: %d) - RAM: Unlimited", name, cmd.Process.Pid)
	}

	if service.Config.RAMBytes > 0 {
		go sm.StartMonitoring(name)
	}

	go sm.monitorService(name, service)

	return nil
}

func (sm *ServiceManager) monitorService(name string, service *ManagedService) {
	err := service.CMD.Wait()

	service.mu.Lock()
	defer service.mu.Unlock()

	if service.Status == "stopped" {
		// log.Printf("Service already stopped: %s", name)
		return
	}

	service.Status = "stopped"

	if err != nil {
		log.Printf("Service stopped: %s - Error: %v", name, err)
	} else {
		log.Printf("Service stopped: %s", name)
	}

	if service.Config.AutoRestart && sm.Ctx.Err() == nil {
		log.Printf("Restarting service: %s", name)
		time.Sleep(5 * time.Second)
		go func() {
			if err := sm.StartService(name); err != nil {
				log.Printf("Service restart error: %s - %v", name, err)
			}
		}()
	}
}

func (sm *ServiceManager) StopService(name string) error {
	sm.Mu.RLock()
	service, exists := sm.Services[name]
	sm.Mu.RUnlock()

	if !exists {
		return fmt.Errorf("can't find service: %s", name)
	}

	service.mu.Lock()
	defer service.mu.Unlock()

	if service.Status != "running" {
		return fmt.Errorf("service not working: %s", name)
	}

	service.Status = "stopped"

	if err := killProcessTree(service.PID); err != nil {
		log.Printf("Process tree kill error: %v", err)
	}

	time.Sleep(5 * time.Second)

	if process, err := os.FindProcess(service.PID); err == nil {
		if err := process.Signal(syscall.Signal(0)); err == nil {
			log.Printf("Process still working, sending SIGKILL: %d", service.PID)
			process.Kill()
		}
	}

	service.CMD = nil
	service.PID = 0
	log.Printf("Service stopped: %s", name)
	return nil
}

func (sm *ServiceManager) GetUserServicePermissions(serviceName string, username string) (ServiceUserPermissions, error) {
	sm.Mu.RLock()
	service, exists := sm.Services[serviceName]
	sm.Mu.RUnlock()

	if !exists {
		return ServiceUserPermissions{}, fmt.Errorf("can't find service: %s", serviceName)
	}

	service.mu.Lock()
	defer service.mu.Unlock()

	for _, v := range service.Config.Users {
		if v.Username == username {
			return v.Permissions, nil
		}
	}

	return ServiceUserPermissions{}, fmt.Errorf("user not listed")

}
