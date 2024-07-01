package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	uuid "github.com/satori/go.uuid"
	"golang.org/x/crypto/bcrypt"
)

// jwt authorization middleware
func authorize(endpoint func(http.ResponseWriter, *http.Request)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader, bearerSchema := r.Header.Get("Authorization"), "Bearer "

		if authHeader != "" && strings.HasPrefix(authHeader, bearerSchema) { // check if bearer header is in correct format, contains access token
			token := authHeader[len(bearerSchema):]
			claims, valid := isValidAccessJWT(token) // validate the access token

			if valid { // if valid go to our desired endpoint
				ctx := context.WithValue(r.Context(), ContextClaimsKey, claims) // pass claims as context
				endpoint(w, r.WithContext(ctx))
			} else { // otherwise the attempted user is unauthorized
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		} else { // if no bearer token, unauthorized
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
	})
}

// tokenRefresh uses the provided refresh token to issue a new auth token
//
//	@Summary		Uses stored refresh token to issue a new auth token
//	@Description	Uses stored refresh token cookie to issue a new auth token
//	@Tags			auth
//	@Produce		application/json
//	@Success		200	{string}	json	"Access token"
//	@Failure		401	{string}	string
//	@Failure		405	{string}	string
//	@Failure		500	{string}	string
//	@Router			/api/tokens/refresh [post]
func tokenRefresh(w http.ResponseWriter, r *http.Request) {
	var t string
	refreshtok, err := r.Cookie("refresh-tok") // get the refresh token cookie
	if err != nil {
		log.Println("Cant find cookie")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	refresh_claims, valid := isValidRefreshJWT(refreshtok.Value) // validate the refresh token

	if valid { // if refresh token is valid, send another access token
		accesstoken := jwt.New(jwt.SigningMethodHS256)
		// set claims
		claims := accesstoken.Claims.(jwt.MapClaims)
		claims["store"] = refresh_claims["store"].(string)
		claims["exp"] = time.Now().Add(time.Minute * 5).Unix()

		t, err = accesstoken.SignedString([]byte(accessSignKey))
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(t) // send access token in response, must be last here
	} else {
		w.WriteHeader(http.StatusUnauthorized)
	}
}

// login validates credentials, and issues access and refresh tokens, refresh -> httponly cookie -> name: refresh-tok
//
//	@Summary		User Login
//	@Description	User login from credentials, issues refresh token cookie and access token
//	@Tags			auth
//	@Accept			application/json
//	@Param			Data	body		UserCredentials	true	"User credentials"
//	@Success		200		{string}	string			"Access token"
//	@Failure		400		{string}	string
//	@Failure		401		{string}	string
//	@Failure		405		{string}	string
//	@Failure		500		{string}	string
//	@Router			/api/account/login [post]
func login(w http.ResponseWriter, r *http.Request) {
	creds := &UserCredentials{}
	err := json.NewDecoder(r.Body).Decode(creds) // decode user credentials
	if err != nil || creds.Username == "" || creds.Password == "" {
		// if there is something wrong with the request body, return a 400 status
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// fetch user to compare with
	user, err := fetchUserByUsername(creds.Username)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PassHash), []byte(creds.Password)); err != nil { // compare hashed password with one provided, if not the same, return unauthorized
		// If the two passwords don't match, return a 401 status
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	new_tokenid := uuid.NewV4()
	new_tokenslug := uuid.NewV4()

	err = updateUserTokenFields(user, new_tokenid, new_tokenslug)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// ensure user content directories exist
	if user.StorageDir.String() != "" {
		err = createDirectoryIfNotExists(romPath + user.StorageDir.String())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		err = createDirectoryIfNotExists(savePath + user.StorageDir.String())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	// if successful, send back token pair to user
	// generate refresh token
	refreshToken := jwt.New(jwt.SigningMethodHS256)
	rtClaims := refreshToken.Claims.(jwt.MapClaims)
	// set claims
	rtClaims["sub"] = new_tokenid.String()
	rtClaims["store"] = user.StorageDir.String()
	rtClaims["exp"] = time.Now().Add(time.Hour * 7).Unix()
	// generate encoded token and send it as response.
	// the signing string should be secret (a generated UUID works too) -> using slug unique to user
	rt, err := refreshToken.SignedString([]byte(new_tokenslug.String())) // user.TokenSlug.String()))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// generate initial access token
	accesstoken := jwt.New(jwt.SigningMethodHS256)
	// set claims
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = user.StorageDir.String()
	claims["exp"] = time.Now().Add(time.Minute * 5).Unix()
	t, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	cookie := http.Cookie{ // send refresh token in cookie
		Name:     "refresh-tok",
		Value:    rt,
		Path:     "/api/tokens/refresh",
		Expires:  time.Now().Add(7 * time.Hour),
		MaxAge:   25200,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   true,
	}

	http.SetCookie(w, &cookie)
	json.NewEncoder(w).Encode(t) // send access token in response, must be last here
}

// logout overwrites the current refresh token cookie
//
//	@Summary		User Logout
//	@Description	User logout
//	@Tags			auth
//	@Param			Authorization	header		string	true	"Bearer Token"
//	@Success		200				{string}	string
//	@Failure		401				{string}	string
//	@Failure		405				{string}	string
//	@Failure		500				{string}	string
//	@Router			/api/account/logout [post]
func logout(w http.ResponseWriter, r *http.Request) {
	cookie := http.Cookie{ // expire refresh token cookie
		Name:     "refresh-tok",
		Value:    "",
		Path:     "/api/tokens/refresh",
		Expires:  time.Now().Add(-24 * time.Hour),
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   true,
	}
	http.SetCookie(w, &cookie)
}
