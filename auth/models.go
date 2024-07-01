package main

import (
	"net/http"

	uuid "github.com/satori/go.uuid"
)

// @Description User Credentials
type UserCredentials struct {
	Username string
	Password string
}

type User struct {
	ID         uint      `gorm:"primaryKey"`
	Username   string    `gorm:"type:text;unique;not null;"`
	PassHash   []byte    `gorm:"not null"`
	TokenSlug  uuid.UUID `gorm:"type:uuid;"`
	TokenID    uuid.UUID `gorm:"type:uuid;index"`
	StorageDir uuid.UUID `gorm:"type:uuid;unique;not null;default:uuid_generate_v4()"`
}

// Route structure of a single route
type Route struct {
	method  string
	pattern string
	handler http.HandlerFunc
}

// Convenience type for route list
type Routes []Route
