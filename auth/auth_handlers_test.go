package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	uuid "github.com/satori/go.uuid"
	"github.com/stretchr/testify/assert"
)

func TestAuthorize(t *testing.T) {
	t.Parallel()

	testEndpointOutput := "test endpoint"
	testEndpoint := func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, testEndpointOutput)
	}

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestAuthorize setup failed: %+v", err)
	}

	invalidToken, err := accesstoken.SignedString([]byte("12345"))
	if err != nil {
		t.Errorf("TestAuthorize setup failed: %+v", err)
	}

	var tests = []struct {
		name            string
		endpoint        func(http.ResponseWriter, *http.Request)
		fullTokenString string
		hasAuthHeader   bool
		wantCode        int
		wantResp        string
	}{
		{"Happy path, good good token and req", testEndpoint, "Bearer " + validToken, true, http.StatusOK, testEndpointOutput},
		{"Error case, invalid token", testEndpoint, "Bearer " + invalidToken, true, http.StatusUnauthorized, ""},
		{"Error case, invalid token (missing bearer prefix)", testEndpoint, validToken, true, http.StatusUnauthorized, ""},
		{"Error case, invalid token (missing auth header)", testEndpoint, "", false, http.StatusUnauthorized, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := authorize(tt.endpoint)

			req, err := http.NewRequest("GET", "http://testing", nil)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			if tt.hasAuthHeader {
				req.Header.Set("Authorization", tt.fullTokenString)
			}

			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestAuthorize() handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")
		})
	}
}

func TestTokenRefresh(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip()
	}

	user := insertAndSelectTestUser(userdb, t)

	refreshToken := jwt.New(jwt.SigningMethodHS256)
	claims := refreshToken.Claims.(jwt.MapClaims)
	claims["sub"] = user.TokenID.String()
	claims["store"] = user.StorageDir.String()
	claims["exp"] = time.Now().Add(time.Hour * 7).Unix()
	validToken, err := refreshToken.SignedString([]byte(user.TokenSlug.String()))
	if err != nil {
		t.Errorf("TestTokenRefresh setup failed: %+v", err)
	}

	cookie := http.Cookie{
		Name:     "refresh-tok",
		Value:    validToken,
		Path:     "/api/tokens/refresh",
		Expires:  time.Now().Add(7 * time.Hour),
		MaxAge:   25200,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   true,
	}

	invalidToken, err := refreshToken.SignedString([]byte("12345"))
	if err != nil {
		t.Errorf("TestTokenRefresh setup failed: %+v", err)
	}

	invalidCookie := http.Cookie{
		Name:     "refresh-tok",
		Value:    invalidToken,
		Path:     "/api/tokens/refresh",
		Expires:  time.Now().Add(7 * time.Hour),
		MaxAge:   25200,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   true,
	}

	var tests = []struct {
		name           string
		refreshToken   *http.Cookie
		wantCode       int
		wantValidToken bool
		wantStore      string
	}{
		{"Happy path, good good token and req", &cookie, http.StatusOK, true, user.StorageDir.String()},
		{"Error case, missing cookie", nil, http.StatusUnauthorized, false, ""},
		{"Error case, invalid cookie", &invalidCookie, http.StatusUnauthorized, false, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("POST", "/api/tokens/refresh", nil)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			if tt.refreshToken != nil {
				req.AddCookie(tt.refreshToken)
			}

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestTokenRefresh() handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			respBody := rr.Body.String()
			if !tt.wantValidToken && respBody != "" {
				t.Errorf("TestTokenRefresh() got body %v wanted invalid token (no body)", respBody)
			}

			if tt.wantValidToken {
				tokenString, err := strconv.Unquote(strings.TrimSpace(respBody))
				if err != nil {
					t.Errorf("TestTokenRefresh failed to unquote response %s %v", tokenString, err)
				}

				claims := jwt.MapClaims{}
				token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
					if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
						return nil, fmt.Errorf("error decoding access token")
					}

					return accessSignKey, nil
				})

				if ((err == nil || token.Valid) && !tt.wantValidToken) ||
					((err != nil || !token.Valid) && tt.wantValidToken) {
					t.Errorf("TestTokenRefresh() handler got invalid token %v want valid %v err %+v", tokenString, tt.wantValidToken, err)
				}

				assert.Equal(t, tt.wantStore, claims["store"].(string), "Returned store does not match")
				assert.GreaterOrEqual(t, claims["exp"].(float64), float64(time.Now().Unix()))
			}
		})
	}
}

func TestLogin(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip()
	}

	user := insertAndSelectTestUser(userdb, t)

	var tests = []struct {
		name           string
		creds          UserCredentials
		wantCode       int
		wantValidToken bool
		wantStore      string
	}{
		{"Happy path, good good token and credentials", UserCredentials{Username: user.Username, Password: "test_user_pwd"}, http.StatusOK, true, user.StorageDir.String()},
		{"Error case, missing credentials", UserCredentials{}, http.StatusBadRequest, false, ""},
		{"Error case, user does not exist", UserCredentials{Username: "does_not_exist", Password: "does_not_exist_pwd"}, http.StatusUnauthorized, false, ""},
		{"Error case, user exists bad password", UserCredentials{Username: user.Username, Password: "does_not_exist_pwd"}, http.StatusUnauthorized, false, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// TODO vancise test for cookie in resp
			var err error
			var body []byte
			if tt.creds != (UserCredentials{}) {
				body, err = json.Marshal(tt.creds)
				if err != nil {
					t.Errorf("TestLogin failed to encode request body: %+v", err)
				}
			}

			req, err := http.NewRequest("POST", "/api/account/login", bytes.NewReader(body))
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestLogin() handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			respBody := rr.Body.String()
			if !tt.wantValidToken && respBody != "" {
				t.Errorf("TestLogin() got body %v wanted invalid token (no body)", respBody)
			}

			if tt.wantValidToken {
				tokenString, err := strconv.Unquote(strings.TrimSpace(respBody))
				if err != nil {
					t.Errorf("TestLogin failed to unquote response %s %v", tokenString, err)
				}

				claims := jwt.MapClaims{}
				token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
					if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
						return nil, fmt.Errorf("error decoding access token")
					}

					return accessSignKey, nil
				})

				if ((err == nil || token.Valid) && !tt.wantValidToken) ||
					((err != nil || !token.Valid) && tt.wantValidToken) {
					t.Errorf("TestLogin() handler got invalid token %v want valid %v err %+v", tokenString, tt.wantValidToken, err)
				}

				assert.Equal(t, tt.wantStore, claims["store"].(string), "Returned store does not match")
				assert.GreaterOrEqual(t, claims["exp"].(float64), float64(time.Now().Unix()))
			}
		})
	}
}

func TestLogout(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestLogout setup failed: %+v", err)
	}

	var tests = []struct {
		name        string
		tokenString string
		wantCode    int
		wantResp    string
		wantCookie  http.Cookie
	}{
		{"Happy path, good good token and req", validToken, http.StatusOK, "", http.Cookie{
			Name:     "refresh-tok",
			Value:    "",
			Path:     "/api/tokens/refresh",
			Expires:  time.Now().Add(-24 * time.Hour),
			MaxAge:   -1,
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
			Secure:   true},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("POST", "/api/account/logout", nil)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			req.Header.Set("Authorization", "Bearer "+tt.tokenString)

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			cookies := rr.Result().Cookies()
			var refreshCookie *http.Cookie
			for _, cookie := range cookies {
				if cookie.Name == tt.wantCookie.Name {
					refreshCookie = cookie
				}
			}

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestLogout() handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")
			assert.Equal(t, tt.wantCookie.Value, refreshCookie.Value)
			assert.Equal(t, tt.wantCookie.Path, refreshCookie.Path)
			assert.True(t, time.Now().After(refreshCookie.Expires))
			assert.Equal(t, tt.wantCookie.MaxAge, refreshCookie.MaxAge)
			assert.Equal(t, tt.wantCookie.HttpOnly, refreshCookie.HttpOnly)
			assert.Equal(t, tt.wantCookie.SameSite, refreshCookie.SameSite)
			assert.Equal(t, tt.wantCookie.Secure, refreshCookie.Secure)
		})
	}
}
