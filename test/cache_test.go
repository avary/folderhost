package test

import (
	"testing"
	"time"

	"github.com/MertJSX/folderhost/utils/cache"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCache_SetAndGet(t *testing.T) {
	cache := createTestCache(t)

	t.Run("should set and get value successfully", func(t *testing.T) {
		key := "test-key"
		value := "test-value"

		cache.Set(key, value, time.Minute)

		got, ok := cache.Get(key)
		assert.True(t, ok, "Get should return true for existing key")
		assert.Equal(t, value, got, "Get should return correct value")
	})

	t.Run("should return false for non-existent key", func(t *testing.T) {
		_, ok := cache.Get("non-existent")
		assert.False(t, ok, "Get should return false for non-existent key")
	})

	t.Run("should override existing key", func(t *testing.T) {
		key := "same-key"

		cache.Set(key, "first-value", time.Minute)
		cache.Set(key, "second-value", time.Minute)

		got, ok := cache.Get(key)
		assert.True(t, ok)
		assert.Equal(t, "second-value", got, "Should return last set value")
	})
}

func TestCache_Delete(t *testing.T) {
	cache := createTestCache(t)

	t.Run("should delete existing key", func(t *testing.T) {
		key := "to-delete"
		cache.Set(key, "value", time.Minute)

		_, ok := cache.Get(key)
		require.True(t, ok, "Key should exist before deletion")

		cache.Delete(key)

		_, ok = cache.Get(key)
		assert.False(t, ok, "Key should not exist after deletion")
	})

	t.Run("should handle delete non-existent key gracefully", func(t *testing.T) {
		assert.NotPanics(t, func() {
			cache.Delete("never-existed")
		})
	})
}

func TestCache_Clear(t *testing.T) {
	cache := createTestCache(t)

	items := map[string]string{
		"key1": "value1",
		"key2": "value2",
		"key3": "value3",
	}

	for key, value := range items {
		cache.Set(key, value, time.Minute)
	}

	for key := range items {
		_, ok := cache.Get(key)
		require.True(t, ok, "All items should exist before clear")
	}

	cache.Clear()

	for key := range items {
		_, ok := cache.Get(key)
		assert.False(t, ok, "No items should exist after clear")
	}

	t.Run("should be empty after clear", func(t *testing.T) {
		cache.Set("new-key", "new-value", time.Minute)
		got, ok := cache.Get("new-key")
		assert.True(t, ok)
		assert.Equal(t, "new-value", got, "Should work normally after clear")
	})
}

func TestCache_Expiration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping expiration test in short mode")
	}

	cache := createTestCache(t)

	t.Run("should expire after TTL", func(t *testing.T) {
		key := "expiring-key"
		cache.Set(key, "value", 500*time.Millisecond)

		_, ok := cache.Get(key)
		assert.True(t, ok, "Should exist before expiration")

		time.Sleep(1500 * time.Millisecond)

		_, ok = cache.Get(key)
		assert.False(t, ok, "Should not exist after TTL")
	})

	t.Run("should not expire before TTL", func(t *testing.T) {
		key := "non-expiring-key"
		cache.Set(key, "value", 2*time.Second)

		time.Sleep(1 * time.Second)

		_, ok := cache.Get(key)
		assert.True(t, ok, "Should still exist before TTL")
	})
}

func TestCache_ConcurrentAccess(t *testing.T) {
	cache := createTestCache(t)
	key := "concurrent-key"

	t.Run("concurrent set and get", func(t *testing.T) {
		const goroutines = 10
		done := make(chan bool, goroutines)

		for i := 0; i < goroutines; i++ {
			go func(idx int) {
				defer func() { done <- true }()

				value := string(rune('A' + idx))
				cache.Set(key, value, time.Minute)

				got, ok := cache.Get(key)
				assert.True(t, ok)
				assert.NotEmpty(t, got)
			}(i)
		}

		for i := 0; i < goroutines; i++ {
			<-done
		}
	})
}

func createTestCache(t *testing.T) *cache.Cache[string, string] {
	t.Helper()

	return cache.CreateCache[string, string](time.Millisecond, cache.CacheProperties{
		SetCacheEvent:     false,
		TimeoutCacheEvent: false,
	})
}
