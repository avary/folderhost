package users

import (
	"crypto/sha256"
	"encoding/hex"

	"github.com/MertJSX/folderhost/database"
)

func UpdateUserPassword(id int, newPassword string) error {
	const query = `
		UPDATE users SET
			password = ?
		WHERE id = ?;
	`

	hash := sha256.Sum256([]byte(newPassword))
	passwordHashString := hex.EncodeToString(hash[:])

	_, err := database.DB.Exec(
		query,
		passwordHashString,
		id,
	)

	return err
}
