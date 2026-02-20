package routes

import (
	"net/url"

	"github.com/MertJSX/folderhost/types"
	serviceutils "github.com/MertJSX/folderhost/utils/service_utils"
	"github.com/gofiber/fiber/v2"
)

func GetServiceLogs(c *fiber.Ctx) error {

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

	if !permissions.ReadLogs {
		return c.Status(403).JSON(
			fiber.Map{
				"err": "No permission",
			},
		)
	}

	logs, err := serviceutils.GlobalServiceManager.GetServiceLogs(serviceName, 200)

	if err != nil {
		return c.Status(500).JSON(
			fiber.Map{
				"error": err.Error(),
			},
		)
	}

	return c.Status(200).JSON(
		fiber.Map{
			"logs": logs,
		},
	)
}
