package main

// program to create sqlite file used by the auth api
// if no file specified it will create a file with the
// default name of users.db
// args:
// 1) existing sqlite file name (optional)

import (
	"fmt"
	"github.com/satori/go.uuid"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/crypto/ssh/terminal"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"os"
	"strings"
)

//types based on models.go
type UserCredentials struct {
	Username string
	Password string
}

type User struct {
	Username  string `gorm:"primaryKey"`
	PassHash  []byte
	TokenSlug uuid.UUID
	TokenID   uuid.UUID `gorm:"index"`
}

//function defs
func register_server_user(userdb *gorm.DB, username string, passwd string) {
	creds := &UserCredentials{Username: username, Password: passwd}
	if creds.Username == "" || creds.Password == "" {
		return
	}
	//salt and hash the password using the bcrypt algorithm
	//the second argument is the cost of hashing, which we arbitrarily set as 8 (this value can be more or less, depending on the computing power you wish to utilize)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(creds.Password), 8)

	tokenslug := uuid.Must(uuid.NewV4(), err)
	if err != nil {
		fmt.Println(err)
		return
	}

	tokenid := uuid.Must(uuid.NewV4(), err)
	if err != nil {
		fmt.Println(err)
		return
	}

	var newuser = User{ //create new user
		Username:  creds.Username,
		PassHash:  hashedPassword,
		TokenSlug: tokenslug,
		TokenID:   tokenid,
	}

	err = userdb.Table("users").Create(&newuser).Error //send new user to the database
	if err != nil {
		fmt.Println("Error creating user " + creds.Username)
		fmt.Println(err)
		return
	}
}

func setup_file(filename string) (*gorm.DB, error) {
	var db *gorm.DB
	var err error
	if filename != "" {
		db, err = gorm.Open(sqlite.Open(filename), &gorm.Config{})
	} else {
		db, err = gorm.Open(sqlite.Open("users.db"), &gorm.Config{})
	}
	db.AutoMigrate(&User{})
	return db, err
}

func enter_creds() (string, string, error) {
	var username string
	var password string

	fmt.Println("Enter Username: ")
	fmt.Scanln(&username)

	fmt.Println("Enter Password: ")
	bytePassword, err := terminal.ReadPassword(0)
	password = string(bytePassword)

	return strings.TrimSpace(username), strings.TrimSpace(password), err
}

func printhelp() {
	fmt.Println("Run command: go run users_db_helper.go <filename (opt)>")
	fmt.Println("Args:")
	fmt.Println("1) existing sqlite file name (optional)")
	fmt.Println("")
	fmt.Println("You will be prompted for your credentials after initiating the run command")
}

func main() {
	var userdb *gorm.DB
	argsWithoutProg := os.Args[1:]

	if len(argsWithoutProg) == 1 && argsWithoutProg[0] == "-h" {
		printhelp()
		return
	}

	username, pass, err := enter_creds()
	if err != nil || username == "" || pass == "" {
		fmt.Println("Error recieving credentials")
		return
	}
	
	if len(argsWithoutProg) > 1 {
		fmt.Println("Invalid arguments, exiting")
		return
	} else if len(argsWithoutProg) == 1 {
		userdb, err = setup_file(argsWithoutProg[0])
	} else {
		userdb, err = setup_file("")
	}

	if err != nil {
		fmt.Println("Error, could not connect to users db")
		return
	}
	register_server_user(userdb, username, pass)
}
