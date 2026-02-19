package routes

import (
	"net/url"

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
