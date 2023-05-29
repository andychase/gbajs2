package main

import (
	"fmt"
	"os"
	"strings"
	"time"

	uuid "github.com/satori/go.uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// fetches postgres dsn from environment
func pgDSN() string {
	dbHost := os.Getenv("PG_DB_HOST")
	dbPort := os.Getenv("PG_DB_PORT")
	dbName := os.Getenv("PG_DB_NAME")
	dbUser := os.Getenv("PG_DB_USER")
	dbPassword := os.Getenv("PG_DB_PASSWORD")
	dbSSLMode := os.Getenv("PG_SSL_MODE")

	if strings.TrimSpace(dbSSLMode) == "" {
		dbSSLMode = "disable"
	}

	return fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=%s", dbUser, dbPassword, dbName, dbHost, dbPort, dbSSLMode)
}

// creates a new gbajs database, sets connection defaults, and pings to establish connection
func newGbaJsDatabase(gconf *gorm.Config) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(pgDSN()), gconf)
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// sets the maximum number of connections in the idle connection pool.
	sqlDB.SetMaxIdleConns(10)

	// sets the maximum number of open connections to the database.
	sqlDB.SetMaxOpenConns(50)

	// sets the maximum amount of time a connection may be reused.
	sqlDB.SetConnMaxLifetime(time.Hour)

	// ping db to establish connection
	err = sqlDB.Ping()
	if err != nil {
		return nil, err
	}

	err = db.AutoMigrate(&User{})
	if err != nil {
		return nil, fmt.Errorf("Error automigrate has failed: %w", err)
	}

	return db, nil
}

// user db functions
// fetches a user by username
func fetchUserByUsername(username string) (*User, error) {
	user := &User{}

	err := userdb.Table("users").Select("id,username,pass_hash,storage_dir").First(&user, "username = ?", username).Error
	if err != nil {
		return nil, err
	}

	return user, err
}

// updates a users token fields
func updateUserTokenFields(user *User, tokenId uuid.UUID, tokenSlug uuid.UUID) error {
	result := userdb.Model(&user).Updates(map[string]interface{}{"token_id": tokenId, "token_slug": tokenSlug})
	if err := result.Error; err != nil {
		return err
	} else if result.RowsAffected == 0 {
		return fmt.Errorf("User does not exist")
	}

	return nil
}

// fetches a users token slug by token id
func fetchTokenSlugByTokenId(tokenId string) ([]byte, error) {
	var user User
	err := userdb.Table("users").Select("token_slug").Where("token_id = ?", tokenId).First(&user).Error

	if err != nil {
		return nil, fmt.Errorf("unable to fetch user: %w", err)
	}

	if user.TokenSlug == uuid.Nil {
		return nil, fmt.Errorf("unable to fetch user: uuid is nil")
	}

	return []byte(user.TokenSlug.String()), nil
}
