package main

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// checks whether a refresh jwt presented as a string is valid, returns claims
// along with boolean indicator of validity
func isValidRefreshJWT(tokenstring string) (jwt.MapClaims, bool) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenstring, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("error decoding refresh token")
		}

		c, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return nil, fmt.Errorf("error casting claims")
		}

		if _, ok := c["sub"]; !ok {
			return nil, fmt.Errorf("missing required claims")
		}

		tokenslug, err := getTokenSlugForTokenID(c["sub"].(string))
		if err != nil {
			return nil, fmt.Errorf("error fetching token slug: %w", err)
		}

		return tokenslug, nil
	})

	if err == nil && token.Valid {
		return claims, true
	}

	return nil, false
}

// checks whether a refresh jwt presented as a string is valid, returns claims
// along with boolean indicator of validity
func isValidAccessJWT(tokenstring string) (jwt.MapClaims, bool) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenstring, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("error decoding access token")
		}

		return accessSignKey, nil
	})

	if err == nil && token.Valid {
		return claims, true
	}

	return nil, false
}

// fetches user token slug for username, used with authentication flow to decode jwt
func getTokenSlugForTokenID(tokenid string) ([]byte, error) {
	tokenSlug, err := fetchTokenSlugByTokenId(tokenid)
	if err != nil {
		return nil, err
	}

	return tokenSlug, nil
}
