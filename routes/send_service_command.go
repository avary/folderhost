package routes

import (
	serviceutils "github.com/MertJSX/folderhost/utils/service_utils"
	"github.com/gofiber/fiber/v2"
)

func SendServiceCommand(c *fiber.Ctx) error {

	var requestBody struct {
		Command string `json:"command"`
		Service string `json:"service"`
	}

	if err := c.BodyParser(&requestBody); err != nil {
		return c.Status(400).JSON(
			fiber.Map{"err": "Bad request! " + err.Error()},
		)
	}

	if requestBody.Command == "" {
		return c.Status(400).JSON(
			fiber.Map{"err": "Bad request! No command provided!"},
		)
	}

	err := serviceutils.GlobalServiceManager.SendCommand(requestBody.Service, requestBody.Command)

	if err != nil {
		return c.Status(500).JSON(
			fiber.Map{
				"error": err.Error(),
			},
		)
	}

	return c.Status(200).JSON(
		fiber.Map{
			"res": "The command was sent successfully!",
		},
	)
}
