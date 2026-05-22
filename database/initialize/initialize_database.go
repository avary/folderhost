package initialize

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/MertJSX/folderhost/database"
	"github.com/MertJSX/folderhost/database/users"
	"github.com/MertJSX/folderhost/utils"
	"github.com/MertJSX/folderhost/utils/config"
)

func InitializeDatabase() {
	var err error
	var firstTime bool = false
	if utils.IsNotExistingPath("./database.db") {
		firstTime = true
	}
	database.DB, err = sql.Open("sqlite", "./database.db")

	if err != nil {
		log.Fatal(err)
	}

	err = database.DB.Ping()
	if err != nil {
		log.Fatal(err)
	}

	_, err = database.DB.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		log.Fatal(err)
	}

	if firstTime {
		database.CreateUsersTable()
		database.CreateLogsTable()
		database.CreateRecoveryTable()
		err = users.CreateUser(&config.Config.AdminAccount)

		if err != nil {
			fmt.Println("Error creating Admin account.")
		}
	}

	users.UpdateAdmin(&config.Config.AdminAccount)

	fmt.Println("Database connection established successfully!")
}
