package resources

import (
	"embed"
)

//go:embed default_config.yml
var DefaultConfig embed.FS

//go:embed default_services.yml
var DefaultServices embed.FS
