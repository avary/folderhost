package utils

import (
	"bytes"
	"fmt"
	"os"
	"regexp"

	"github.com/MertJSX/folderhost/resources"
	"gopkg.in/yaml.v3"
)

func MigrateConfigIfNeeded() {
	userConfigData, err := os.ReadFile("./config.yml")
	if err != nil {
		return
	}

	var userRoot yaml.Node
	err = yaml.Unmarshal(userConfigData, &userRoot)
	if err != nil {
		fmt.Printf("Cannot parse your config.yml for migration: %v\n", err)
		return
	}

	defaultConfigData, err := resources.DefaultConfig.ReadFile("default_config.yml")
	if err != nil {
		return
	}

	var defaultRoot yaml.Node
	err = yaml.Unmarshal(defaultConfigData, &defaultRoot)
	if err != nil {
		return
	}

	userVersion := getVersion(&userRoot)
	defaultVersion := getVersion(&defaultRoot)

	if userVersion == defaultVersion {
		return
	}

	displayUserVersion := userVersion
	if displayUserVersion == "" {
		displayUserVersion = "unknown"
	}

	fmt.Printf("\nYour config.yml is outdated (%s -> %s). Migrating it automatically...\n", displayUserVersion, defaultVersion)

	if len(defaultRoot.Content) > 0 && len(userRoot.Content) > 0 {
		mergeYamlNodes(defaultRoot.Content[0], userRoot.Content[0])
	}

	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	err = enc.Encode(&defaultRoot)
	enc.Close()

	if err != nil {
		fmt.Printf("Failed to encode migrated config: %v\n", err)
		return
	}

	mergedString := buf.String()
	re := regexp.MustCompile(`(?m)^([a-zA-Z0-9_-]+:.*?)\n([ \t]*#)`)
	mergedString = re.ReplaceAllString(mergedString, "$1\n\n$2")

	err = os.WriteFile("./config.yml", []byte(mergedString), 0644)
	if err != nil {
		fmt.Printf("Failed to write migrated config: %v\n", err)
		return
	}

	fmt.Println("Migration successful! Don't forget to check your config.yml and make sure everything is correct!")
}

func getVersion(root *yaml.Node) string {
	if root.Kind != yaml.DocumentNode || len(root.Content) == 0 {
		return ""
	}
	mapping := root.Content[0]
	if mapping.Kind != yaml.MappingNode {
		return ""
	}

	for i := 0; i < len(mapping.Content); i += 2 {
		if mapping.Content[i].Value == "version" {
			return mapping.Content[i+1].Value
		}
	}
	return ""
}

func mergeYamlNodes(dst, src *yaml.Node) {
	if dst.Kind != yaml.MappingNode || src.Kind != yaml.MappingNode {
		dst.Value = src.Value
		dst.Content = src.Content
		dst.Style = src.Style
		dst.Kind = src.Kind
		dst.Tag = src.Tag
		return
	}

	for i := 0; i < len(src.Content); i += 2 {
		srcKey := src.Content[i]
		srcVal := src.Content[i+1]

		if srcKey.Value == "version" {
			continue
		}

		found := false
		for j := 0; j < len(dst.Content); j += 2 {
			dstKey := dst.Content[j]
			dstVal := dst.Content[j+1]

			if dstKey.Value == srcKey.Value {
				mergeYamlNodes(dstVal, srcVal)
				found = true
				break
			}
		}

		if !found {
			dst.Content = append(dst.Content, srcKey, srcVal)
		}
	}
}
