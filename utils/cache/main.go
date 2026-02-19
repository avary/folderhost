package cache

import (
	"encoding/json"
	"time"

	"github.com/MertJSX/folderhost/types"
	"github.com/MertJSX/folderhost/utils"
	"github.com/gofiber/fiber/v2"
)

var SessionCache *Cache[string, types.Account] = CreateCache[string, types.Account](5*time.Minute, CacheProperties{
	SetCacheEvent:     false,
	TimeoutCacheEvent: false,
})

var DirectoryCache *Cache[DirectoryCacheKey, types.ReadDirCache] = CreateCache[DirectoryCacheKey, types.ReadDirCache](30*time.Second, CacheProperties{
	SetCacheEvent:     true,
	TimeoutCacheEvent: false,
})

var EditorWatcherCache *Cache[string, types.EditorWatcherCache] = CreateCache[string, types.EditorWatcherCache](0, CacheProperties{
	SetCacheEvent:     false,
	TimeoutCacheEvent: false,
})

var DownloadLinkCache *Cache[string, types.DownloadLinkCache] = CreateCache[string, types.DownloadLinkCache](1*time.Minute, CacheProperties{
	SetCacheEvent:     false,
	TimeoutCacheEvent: false,
})

func ListenDirectorySetCacheEvents() {
	msg, _ := json.Marshal(fiber.Map{
		"type": "directory-update",
	})

	for key := range DirectoryCache.SetCacheEvent {
		utils.SendToAll(key.Path, 1, msg)
	}
}
