package main

import (
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/satori/go.uuid"
)

//checks whether a refresh jwt presented as a string is valid, returns claims
//along with boolean indicator of validity
func isValidRefreshJWT(tokenstring string) (jwt.MapClaims, bool) {
	claims, tokenslug := jwt.MapClaims{}, []byte{}
	token, err := jwt.ParseWithClaims(tokenstring, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("error decoding refresh token")
		}

		c, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			fmt.Println("error with claims")
		}
		tokenslug = getTokenSlugForTokenID(c["sub"].(string))
		return tokenslug, nil
	})

	if err != nil {
		fmt.Println("printing parse jwt error here 2")
		fmt.Println(err) //here for debug only
		return nil, false
	} else if err == nil && token.Valid {
		return claims, true
	}

	return nil, false
}

//checks whether a refresh jwt presented as a string is valid, returns claims
//along with boolean indicator of validity
func isValidAccessJWT(tokenstring string) (jwt.MapClaims, bool) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenstring, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("error decoding access token")
		}

		return AccessSignKey, nil
	})

	if err != nil {
		fmt.Println("printing parse jwt error here 2")
		fmt.Println(err) //here for debug only
		return nil, false
	} else if err == nil && token.Valid && claims["sub"] != nil {
		return claims, true
	}

	return nil, false
}

//fetches user token slug for username, used with authentication flow to decode jwt
func getTokenSlugForTokenID(tokenid string) []byte {
	var user User
	err := userdb.Table("users").Select("token_slug").Where("token_id = ?", tokenid).Scan(&user).Error

	if err != nil {
		fmt.Println("unable to fetch user")
		fmt.Println(err)
		return nil
	}

	if user.TokenSlug == uuid.Nil {
		fmt.Println("unable to fetch user")
		return nil
	}

	return []byte(user.TokenSlug.String())
}
