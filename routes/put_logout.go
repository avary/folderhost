package routes

import (
	"github.com/MertJSX/folderhost/utils/cache"
	"github.com/gofiber/fiber/v2"
)

func Logout(c *fiber.Ctx) error {
	token := c.Get("Authorization")

	if token == "" {
		return c.Status(400).JSON(fiber.Map{
			"err": "no token provided",
		})
	}

	_, ok := cache.TokenFingerprint.Get(token)

	if !ok {
		return c.Status(400).JSON(fiber.Map{
			"err": "token is not existing in cache",
		})
	}

	cache.TokenFingerprint.Delete(token)
	return c.Status(200).JSON(fiber.Map{
		"res": "token is successfully deleted from cache",
	})
}
