package main

import (
	"github.com/satori/go.uuid"
)

//type for route list
type Routes []Route

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
