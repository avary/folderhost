package routes

import (
	"net/url"

	"github.com/MertJSX/folderhost/types"
	serviceutils "github.com/MertJSX/folderhost/utils/service_utils"
	"github.com/gofiber/fiber/v2"
)

func StartService(c *fiber.Ctx) error {

	serviceName := c.Params("service")
	serviceName, err := url.QueryUnescape(serviceName)

	if err != nil {
		return c.Status(400).JSON(
			fiber.Map{
				"error": "Bad request",
			},
		)
	}

	permissions, err := serviceutils.GlobalServiceManager.GetUserServicePermissions(serviceName, c.Locals("account").(types.Account).Username)

	if err != nil {
		if err.Error() == "user not listed" {
			return c.Status(403).JSON(
				fiber.Map{
					"err": "No permission",
				},
			)
		}

		return c.Status(500).JSON(
			fiber.Map{
				"err": err.Error(),
			},
		)
	}

	if !permissions.Start {
		return c.Status(403).JSON(
			fiber.Map{
				"err": "No permission",
			},
		)
	}

	err = serviceutils.GlobalServiceManager.StartService(serviceName)

	if err != nil {
		return c.Status(500).JSON(
			fiber.Map{
				"err": err.Error(),
			},
		)
	}

	return c.Status(200).JSON(
		fiber.Map{
			"res": "Successfully started!",
		},
	)
}
