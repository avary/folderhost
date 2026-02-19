package serviceutils

import (
	"context"
	"io"
	"os/exec"
	"sync"
	"time"
)

type ServiceConfig struct {
	Enabled  bool      `yaml:"enable_services"`
	Services []Service `yaml:"services"`
}

type Service struct {
	Title                  string `yaml:"title"`
	Workdir                string `yaml:"workdir"`
	Script                 string `yaml:"script"`
	RAM                    string `yaml:"ram"`
	RAMBytes               int64
	AutoStart              bool           `yaml:"auto_start"`
	AutoRestart            bool           `yaml:"auto_restart"`
	AllowExecutingCommands bool           `yaml:"allow_executing_commands"`
	Users                  []ServiceUsers `yaml:"users"`
}

type ServiceUsers struct {
	Username    string                 `yaml:"username"`
	Permissions ServiceUserPermissions `yaml:"permissions"`
}

type ServiceUserPermissions struct {
	Start           bool `yaml:"start"`
	Stop            bool `yaml:"stop"`
	ReadLogs        bool `yaml:"read_logs"`
	ExecuteCommands bool `yaml:"execute_commands"`
}

type ServiceManager struct {
	Services   map[string]*ManagedService
	Mu         sync.RWMutex
	Ctx        context.Context
	Cancel     context.CancelFunc
	WorkingDir string
	Config     ServiceConfig
}

type ManagedService struct {
	Config    Service
	CMD       *exec.Cmd
	Status    string
	StartTime time.Time
	PID       int
	WorkDir   string
	mu        sync.RWMutex
	LogBuffer *LogBuffer
	Stdin     io.WriteCloser
}

type ServiceStatus struct {
	Name        string        `json:"name"`
	Status      string        `json:"status"`
	PID         int           `json:"pid,omitempty"`
	StartTime   time.Time     `json:"start_time,omitempty"`
	Uptime      time.Duration `json:"uptime,omitempty"`
	WorkDir     string        `json:"work_dir,omitempty"`
	RAM         string        `json:"ram,omitempty"`
	RAMBytes    int64         `json:"ram_bytes,omitempty"`
	RAMUsage    int64         `json:"ram_usage,omitempty"`
	RAMUsageStr string        `json:"ram_usage_str,omitempty"`
}

type LogBuffer struct {
	Lines    []string
	MaxLines int
	mu       sync.RWMutex
}

type SoftLimiter struct {
	PID          int
	SoftLimit    int64
	HardLimit    int64
	WarningCount int
	LastWarning  time.Time
}
