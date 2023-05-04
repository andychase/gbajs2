package main

import (
	"fmt"
	"github.com/dgrijalva/jwt-go"
)

// checks whether a refresh jwt presented as a string is valid, returns claims
// along with boolean indicator of validity
func isValidRefreshJWT(tokenstring string) (jwt.MapClaims, bool) {
	claims, tokenslug := jwt.MapClaims{}, []byte{}
	token, err := jwt.ParseWithClaims(tokenstring, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("error decoding refresh token")
		}

		c, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return nil, fmt.Errorf("error casting claims")
		}

		tokenslug = getTokenSlugForTokenID(c["sub"].(string))

		return tokenslug, nil
	})

	if err != nil {
		return nil, false
	} else if err == nil && token.Valid {
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

		return AccessSignKey, nil
	})

	if err != nil {
		return nil, false
	} else if err == nil && token.Valid && claims["store"] != nil {
		return claims, true
	}

	return nil, false
}

// fetches user token slug for username, used with authentication flow to decode jwt
func getTokenSlugForTokenID(tokenid string) []byte {
	tokenSlug, err := fetchTokenSlugByTokenId(tokenid)
	if err != nil {
		fmt.Println(err)
		return nil
	}

	return tokenSlug
}
