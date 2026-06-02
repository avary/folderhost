package users

import (
	"encoding/hex"

	"github.com/MertJSX/folderhost/database"
	"github.com/MertJSX/folderhost/utils"
)

func UpdateUserPassword(id int, newPassword string) error {
	const query = `
		UPDATE users SET
			password = ?
		WHERE id = ?;
	`

	hash, err := utils.Hash([]byte(newPassword))
	if err != nil {
		return err
	}
	defer clear(hash)

	passwordHashString := hex.EncodeToString(hash[:])
	_, err = database.DB.Exec(
		query,
		passwordHashString,
		id,
	)

	return err
}
