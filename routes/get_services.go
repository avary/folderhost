package routes

import (
	"github.com/MertJSX/folderhost/types"
	serviceutils "github.com/MertJSX/folderhost/utils/service_utils"
	"github.com/gofiber/fiber/v2"
)

func GetServices(c *fiber.Ctx) error {
	services := serviceutils.GlobalServiceManager.ListAllowedServices(c.Locals("account").(types.Account).Username)

	return c.Status(200).JSON(
		fiber.Map{
			"services": services,
		},
	)
}
