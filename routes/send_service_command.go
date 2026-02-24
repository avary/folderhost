package routes

import (
	"fmt"

	"github.com/MertJSX/folderhost/database/logs"
	"github.com/MertJSX/folderhost/types"
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

	permissions, err := serviceutils.GlobalServiceManager.GetUserServicePermissions(requestBody.Service, c.Locals("account").(types.Account).Username)

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

	if !permissions.ExecuteCommands {
		return c.Status(403).JSON(
			fiber.Map{
				"err": "No permission",
			},
		)
	}

	err = serviceutils.GlobalServiceManager.SendCommand(requestBody.Service, requestBody.Command)

	if err != nil {
		return c.Status(500).JSON(
			fiber.Map{
				"error": err.Error(),
			},
		)
	}

	logs.CreateLog(types.AuditLog{
		Username:    c.Locals("account").(types.Account).Username,
		Action:      "Run command",
		Description: fmt.Sprintf(`%s ran "%s" command in "%s" service.`, c.Locals("account").(types.Account).Username, requestBody.Command, requestBody.Service),
	})

	return c.Status(200).JSON(
		fiber.Map{
			"res": "The command was sent successfully!",
		},
	)
}
