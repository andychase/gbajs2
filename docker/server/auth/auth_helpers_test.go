package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	uuid "github.com/satori/go.uuid"
	"github.com/stretchr/testify/assert"
)

func TestIsValidRefreshJWT(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip()
	}

	user := insertAndSelectTestUser(userdb, t)

	refreshToken := jwt.New(jwt.SigningMethodHS256)
	claims := refreshToken.Claims.(jwt.MapClaims)
	// set claims
	claims["sub"] = user.TokenID.String()
	claims["store"] = user.StorageDir.String()
	claims["exp"] = time.Now().Add(time.Hour * 7).Unix()
	validToken, err := refreshToken.SignedString([]byte(user.TokenSlug.String()))
	if err != nil {
		t.Errorf("TestIsValidRefreshJWT setup failed: %+v", err)
	}

	invalidToken, err := refreshToken.SignedString([]byte("12345"))
	if err != nil {
		t.Errorf("TestIsValidRefreshJWT setup failed: %+v", err)
	}

	refreshToken2 := jwt.New(jwt.SigningMethodHS256)
	claims2 := refreshToken2.Claims.(jwt.MapClaims)
	claims2["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidTokenNoClaims, err := refreshToken2.SignedString([]byte(user.TokenSlug.String()))
	if err != nil {
		t.Errorf("TestIsValidRefreshJWT setup failed: %+v", err)
	}

	refreshToken3 := jwt.New(jwt.SigningMethodES256)
	claims3 := refreshToken3.Claims.(jwt.MapClaims)
	claims3["sub"] = user.TokenID.String()
	claims3["store"] = user.StorageDir.String()
	claims3["exp"] = time.Now().Add(time.Hour * 7).Unix()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Errorf("TestIsValidRefreshJWT setup failed: %+v", err)
	}

	invalidTokenBadSigningMethod, err := refreshToken3.SignedString(key)
	if err != nil {
		t.Errorf("TestIsValidRefreshJWT setup failed: %+v", err)
	}

	refreshToken4 := jwt.New(jwt.SigningMethodHS256)
	claims4 := refreshToken4.Claims.(jwt.MapClaims)
	claims4["sub"] = uuid.NewV4().String()
	claims4["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidTokenIdDoesNotExist, err := refreshToken4.SignedString([]byte(user.TokenSlug.String()))
	if err != nil {
		t.Errorf("TestIsValidRefreshJWT setup failed: %+v", err)
	}

	var tests = []struct {
		name        string
		tokenString string
		want        jwt.MapClaims
		wantValid   bool
	}{
		{"Happy path, valid token", validToken, jwt.MapClaims{"exp": float64(claims["exp"].(int64)), "sub": claims["sub"], "store": claims["store"]}, true},
		{"Error case, invalid token", invalidToken, nil, false},
		{"Error case, invalid token (missing required claims)", invalidTokenNoClaims, nil, false},
		{"Error case, invalid token bad signing method", invalidTokenBadSigningMethod, nil, false},
		{"Error case, user tokenid is invalid", invalidTokenIdDoesNotExist, nil, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotValid := isValidRefreshJWT(tt.tokenString)
			if gotValid != tt.wantValid {
				t.Errorf("TestIsValidRefreshJWT(%v) got valid %v, wanted valid %v", tt.tokenString, gotValid, tt.wantValid)
			}
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestIsValidAccessJWT(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestIsValidAccessJWT setup failed: %+v", err)
	}

	invalidToken, err := accesstoken.SignedString([]byte("12345"))
	if err != nil {
		t.Errorf("TestIsValidAccessJWT setup failed: %+v", err)
	}

	accessToken2 := jwt.New(jwt.SigningMethodES256)
	claims3 := accessToken2.Claims.(jwt.MapClaims)
	claims3["store"] = uuid.NewV4().String()
	claims3["exp"] = time.Now().Add(time.Hour * 7).Unix()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Errorf("TestIsValidRefreshJWT setup failed: %+v", err)
	}

	invalidTokenBadSigningMethod, err := accessToken2.SignedString(key)
	if err != nil {
		t.Errorf("TestIsValidRefreshJWT setup failed: %+v", err)
	}

	var tests = []struct {
		name        string
		tokenString string
		want        jwt.MapClaims
		wantValid   bool
	}{
		{"Happy path, valid token", validToken, jwt.MapClaims{"exp": float64(claims["exp"].(int64)), "store": claims["store"]}, true},
		{"Error case, invalid token", invalidToken, nil, false},
		{"Error case, invalid token bad signing method", invalidTokenBadSigningMethod, nil, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotValid := isValidAccessJWT(tt.tokenString)
			if gotValid != tt.wantValid {
				t.Errorf("TestIsValidAccessJWT(%v) got valid %v, wanted valid %v", tt.tokenString, gotValid, tt.wantValid)
			}
			assert.Equal(t, tt.want, got)
		})
	}
}
