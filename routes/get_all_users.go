package routes

import (
	"github.com/MertJSX/folderhost/database/users"
	"github.com/MertJSX/folderhost/types"
	"github.com/gofiber/fiber/v2"
)

func GetAllUsers(c *fiber.Ctx) error {
	if !c.Locals("account").(types.Account).Permissions.ReadUsers {
		return c.Status(403).JSON(
			fiber.Map{"err": "No permission!"},
		)
	}

	users, err := users.GetAll()

	if err != nil {
		return c.Status(500).JSON(
			fiber.Map{"err": "Unknown error!"},
		)
	}

	return c.Status(200).JSON(
		fiber.Map{"users": users},
	)
}
