package main

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	uuid "github.com/satori/go.uuid"
	"github.com/spf13/afero"
	"github.com/stretchr/testify/assert"
)

func TestHelloWorld(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestIsValidAccessJWT setup failed: %+v", err)
	}

	var tests = []struct {
		name        string
		tokenString string
		wantCode    int
		wantResp    string
	}{
		{"Happy path, good good token and req", validToken, http.StatusOK, "Hello World! This is a GBA file/auth server, written in Golang."},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/", nil)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			req.Header.Set("Authorization", "Bearer "+tt.tokenString)

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestHelloWorld() handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")
		})
	}
}

func TestDownloadSave(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestDownloadSave setup failed: %+v", err)
	}

	accesstoken2 := jwt.New(jwt.SigningMethodHS256)
	claims2 := accesstoken2.Claims.(jwt.MapClaims)
	claims2["store"] = uuid.NewV4().String()
	claims2["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidToken, err := accesstoken2.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestDownloadSave setup failed: %+v", err)
	}

	accesstoken3 := jwt.New(jwt.SigningMethodHS256)
	claims3 := accesstoken3.Claims.(jwt.MapClaims)
	claims3["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidTokenMissingClaims, err := accesstoken3.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestDownloadSave setup failed: %+v", err)
	}

	testDirPath := "/local_saves/" + claims["store"].(string)
	appFs.MkdirAll(testDirPath, 0755)

	setupFiles := map[string][]byte{
		testDirPath + "/a.sav": []byte("save a"),
	}

	for filePath, fileData := range setupFiles {
		err := afero.WriteFile(appFs, filePath, fileData, 0644)
		if err != nil {
			t.Errorf("TestDownloadSave could not create test file %s: %+v", filePath, err)
		}
	}

	var tests = []struct {
		name        string
		tokenString string
		queryString string
		wantCode    int
		wantResp    string
	}{
		{"Happy path, good params and content", validToken, "?save=a.sav", http.StatusOK, "save a"},
		{"Error case, missing required query parameters", validToken, "", http.StatusBadRequest, ""},
		{"Error case, missing required claims", invalidTokenMissingClaims, "?save=a.sav", http.StatusBadRequest, ""},
		{"Error case, user store does not exist", invalidToken, "?save=a.sav", http.StatusInternalServerError, ""},
		{"Error case, file does not exist", invalidToken, "?save=b.sav", http.StatusInternalServerError, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/save/download"+tt.queryString, nil)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			req.Header.Set("Authorization", "Bearer "+tt.tokenString)

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestDownloadSave() handler returned wrong status code: got %v want %v", status, tt.wantCode)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")
		})
	}
}

func TestDownloadRom(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestDownloadRom setup failed: %+v", err)
	}

	accesstoken2 := jwt.New(jwt.SigningMethodHS256)
	claims2 := accesstoken2.Claims.(jwt.MapClaims)
	claims2["store"] = uuid.NewV4().String()
	claims2["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidToken, err := accesstoken2.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestDownloadRom setup failed: %+v", err)
	}

	accesstoken3 := jwt.New(jwt.SigningMethodHS256)
	claims3 := accesstoken3.Claims.(jwt.MapClaims)
	claims3["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidTokenMissingClaims, err := accesstoken3.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestDownloadRom setup failed: %+v", err)
	}

	testDirPath := "/local_roms/" + claims["store"].(string)
	appFs.MkdirAll(testDirPath, 0755)

	setupFiles := map[string][]byte{
		testDirPath + "/a.gba": []byte("rom a"),
	}

	for filePath, fileData := range setupFiles {
		err := afero.WriteFile(appFs, filePath, fileData, 0644)
		if err != nil {
			t.Errorf("TestDownloadRom could not create test file %s: %+v", filePath, err)
		}
	}

	var tests = []struct {
		name        string
		tokenString string
		queryString string
		wantCode    int
		wantResp    string
	}{
		{"Happy path, good params and content", validToken, "?rom=a.gba", http.StatusOK, "rom a"},
		{"Error case, missing required query parameters", validToken, "", http.StatusBadRequest, ""},
		{"Error case, missing required claims", invalidTokenMissingClaims, "?rom=a.gba", http.StatusBadRequest, ""},
		{"Error case, user store does not exist", invalidToken, "?rom=a.gba", http.StatusInternalServerError, ""},
		{"Error case, file does not exist", invalidToken, "?rom=b.gba", http.StatusInternalServerError, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/rom/download"+tt.queryString, nil)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			req.Header.Set("Authorization", "Bearer "+tt.tokenString)

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestDownloadRom() handler returned wrong status code: got %v want %v", status, tt.wantCode)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")
		})
	}
}

func TestUploadRom(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestUploadRom setup failed: %+v", err)
	}

	accesstoken2 := jwt.New(jwt.SigningMethodHS256)
	claims2 := accesstoken2.Claims.(jwt.MapClaims)
	claims2["store"] = uuid.NewV4().String()
	claims2["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidToken, err := accesstoken2.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestUploadRom setup failed: %+v", err)
	}

	accesstoken3 := jwt.New(jwt.SigningMethodHS256)
	claims3 := accesstoken3.Claims.(jwt.MapClaims)
	claims3["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidTokenMissingClaims, err := accesstoken3.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestUploadRom setup failed: %+v", err)
	}

	testDirPath := "/local_roms/" + claims["store"].(string)
	appFs.MkdirAll(testDirPath, 0755)

	var tests = []struct {
		name                       string
		tokenString                string
		fieldName                  string
		fileName                   string
		fileContents               []byte
		wantCode                   int
		wantResp                   string
		wantContents               []byte
		wantOpenErr                bool
		expectedToFailWithMemMapFs bool
	}{
		{"Happy path, good token and req (.gba)", validToken, "rom", "a.gba", []byte("rom a"), http.StatusOK, "", []byte("rom a"), false, false},
		{"Happy path, good token and req (.gbc)", validToken, "rom", "b.gbc", []byte("rom b"), http.StatusOK, "", []byte("rom b"), false, false},
		{"Happy path, good token and req (.gb)", validToken, "rom", "c.gb", []byte("rom c"), http.StatusOK, "", []byte("rom c"), false, false},
		{"Happy path, good token and req (.zip)", validToken, "rom", "d.zip", []byte("rom d"), http.StatusOK, "", []byte("rom d"), false, false},
		{"Happy path, good token and req (.7z)", validToken, "rom", "e.7z", []byte("rom e"), http.StatusOK, "", []byte("rom e"), false, false},
		{"Error case, missing form file", validToken, "rom", "d.gba", nil, http.StatusBadRequest, "", nil, true, false},
		{"Error case, invalid form field", validToken, "file", "e.gba", []byte("rom e"), http.StatusBadRequest, "", nil, true, false},
		{"Error case, invalid file extension", validToken, "rom", "f.nds", []byte("rom f"), http.StatusBadRequest, "File not in gba format, expected extensions are .gba/.gbc/.gb/.zip/.7z", nil, true, false},
		{"Error case, user store does not exist", invalidToken, "rom", "g.gba", []byte("rom g"), http.StatusInternalServerError, "", nil, true, true},
		{"Error case, missing required claims", invalidTokenMissingClaims, "rom", "h.gba", []byte("rom h"), http.StatusBadRequest, "", nil, true, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !(*testconf.useOsFs) && tt.expectedToFailWithMemMapFs {
				t.Skip()
			}

			var writer *multipart.Writer
			body := new(bytes.Buffer)
			if tt.fileContents != nil {
				writer = multipart.NewWriter(body)
				part, err := writer.CreateFormFile(tt.fieldName, tt.fileName)
				if err != nil {
					t.Errorf("TestUploadRom multipart setup failed: %+v", err)
				}
				part.Write(tt.fileContents)
				writer.Close()
			}

			req, err := http.NewRequest("POST", "/api/rom/upload", body)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			req.Header.Set("Authorization", "Bearer "+tt.tokenString)
			if writer != nil {
				req.Header.Set("Content-Type", writer.FormDataContentType())
			}

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			// check request code and response
			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestUploadRom() handler returned wrong status code: got %v want %v", status, tt.wantCode)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")

			// read file
			got, openErr := afero.ReadFile(appFs, testDirPath+"/"+tt.fileName)
			if openErr != nil && !tt.wantOpenErr ||
				openErr == nil && tt.wantOpenErr {
				t.Errorf("TestUploadRom() err opening file %v, want err %v", openErr, tt.wantOpenErr)
			}

			// compare contents
			assert.Equal(t, tt.wantContents, got)
		})
	}
}

func TestUploadSave(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestUploadSave setup failed: %+v", err)
	}

	accesstoken2 := jwt.New(jwt.SigningMethodHS256)
	claims2 := accesstoken2.Claims.(jwt.MapClaims)
	claims2["store"] = uuid.NewV4().String()
	claims2["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidToken, err := accesstoken2.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestUploadSave setup failed: %+v", err)
	}

	accesstoken3 := jwt.New(jwt.SigningMethodHS256)
	claims3 := accesstoken3.Claims.(jwt.MapClaims)
	claims3["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidTokenMissingClaims, err := accesstoken3.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestUploadSave setup failed: %+v", err)
	}

	testDirPath := "/local_saves/" + claims["store"].(string)
	appFs.MkdirAll(testDirPath, 0755)

	var tests = []struct {
		name                       string
		tokenString                string
		fieldName                  string
		fileName                   string
		fileContents               []byte
		wantCode                   int
		wantResp                   string
		wantContents               []byte
		wantOpenErr                bool
		expectedToFailWithMemMapFs bool
	}{
		{"Happy path, good token and req", validToken, "save", "a.sav", []byte("save a"), http.StatusOK, "", []byte("save a"), false, false},
		{"Error case, missing form file", validToken, "rom", "b.sav", nil, http.StatusBadRequest, "", nil, true, false},
		{"Error case, invalid form field", validToken, "file", "c.sav", []byte("sav e"), http.StatusBadRequest, "", nil, true, false},
		{"Error case, user store does not exist", invalidToken, "save", "d.sav", []byte("sav d"), http.StatusInternalServerError, "", nil, true, true},
		{"Error case, missing required claims", invalidTokenMissingClaims, "save", "e.gba", []byte("sav e"), http.StatusBadRequest, "", nil, true, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !(*testconf.useOsFs) && tt.expectedToFailWithMemMapFs {
				t.Skip()
			}

			var writer *multipart.Writer
			body := new(bytes.Buffer)
			if tt.fileContents != nil {
				writer = multipart.NewWriter(body)
				part, err := writer.CreateFormFile(tt.fieldName, tt.fileName)
				if err != nil {
					t.Errorf("TestUploadSave multipart setup failed: %+v", err)
				}
				part.Write(tt.fileContents)
				writer.Close()
			}

			req, err := http.NewRequest("POST", "/api/save/upload", body)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			req.Header.Set("Authorization", "Bearer "+tt.tokenString)
			if writer != nil {
				req.Header.Set("Content-Type", writer.FormDataContentType())
			}

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			// check request code and response
			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestUploadSave() handler returned wrong status code: got %v want %v", status, tt.wantCode)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")

			// read file
			got, openErr := afero.ReadFile(appFs, testDirPath+"/"+tt.fileName)
			if openErr != nil && !tt.wantOpenErr ||
				openErr == nil && tt.wantOpenErr {
				t.Errorf("TestUploadSave() err opening file %v, want err %v", openErr, tt.wantOpenErr)
			}

			// compare contents
			assert.Equal(t, tt.wantContents, got)
		})
	}
}

func TestListAllRoms(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestListAllRoms setup failed: %+v", err)
	}

	accesstoken2 := jwt.New(jwt.SigningMethodHS256)
	claims2 := accesstoken2.Claims.(jwt.MapClaims)
	claims2["store"] = uuid.NewV4().String()
	claims2["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidToken, err := accesstoken2.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestListAllSaves setup failed: %+v", err)
	}

	accesstoken3 := jwt.New(jwt.SigningMethodHS256)
	claims3 := accesstoken3.Claims.(jwt.MapClaims)
	claims3["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidTokenMissingClaims, err := accesstoken3.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestListAllSaves setup failed: %+v", err)
	}

	testDirPath := "/local_roms/" + claims["store"].(string)
	appFs.MkdirAll(testDirPath, 0755)

	setupFiles := map[string][]byte{
		testDirPath + "/a.gba": []byte("rom a"),
		testDirPath + "/b.gba": []byte("rom b"),
		testDirPath + "/c.gba": []byte("rom c"),
	}

	for filePath, fileData := range setupFiles {
		err := afero.WriteFile(appFs, filePath, fileData, 0644)
		if err != nil {
			t.Errorf("TestListAllRoms could not create test file %s: %+v", filePath, err)
		}
	}

	var tests = []struct {
		name        string
		tokenString string
		wantCode    int
		wantResp    string
	}{
		{"Happy path, good good token and req", validToken, http.StatusOK, "[\"a.gba\",\"b.gba\",\"c.gba\"]"},
		{"Error case, user store does not exist", invalidToken, http.StatusInternalServerError, ""},
		{"Error case, missing required claims", invalidTokenMissingClaims, http.StatusBadRequest, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/rom/list", nil)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			req.Header.Set("Authorization", "Bearer "+tt.tokenString)

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestListAllRoms() handler returned wrong status code: got %v want %v", status, tt.wantCode)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")
		})
	}
}

func TestListAllSaves(t *testing.T) {
	t.Parallel()

	accesstoken := jwt.New(jwt.SigningMethodHS256)
	claims := accesstoken.Claims.(jwt.MapClaims)
	claims["store"] = uuid.NewV4().String()
	claims["exp"] = time.Now().Add(time.Minute * 1).Unix()
	validToken, err := accesstoken.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestListAllSaves setup failed: %+v", err)
	}

	accesstoken2 := jwt.New(jwt.SigningMethodHS256)
	claims2 := accesstoken2.Claims.(jwt.MapClaims)
	claims2["store"] = uuid.NewV4().String()
	claims2["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidToken, err := accesstoken2.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestListAllSaves setup failed: %+v", err)
	}

	accesstoken3 := jwt.New(jwt.SigningMethodHS256)
	claims3 := accesstoken3.Claims.(jwt.MapClaims)
	claims3["exp"] = time.Now().Add(time.Minute * 1).Unix()
	invalidTokenMissingClaims, err := accesstoken3.SignedString([]byte(accessSignKey))
	if err != nil {
		t.Errorf("TestListAllSaves setup failed: %+v", err)
	}

	testDirPath := "/local_saves/" + claims["store"].(string)
	appFs.MkdirAll(testDirPath, 0755)

	setupFiles := map[string][]byte{
		testDirPath + "/a.sav": []byte("sav a"),
		testDirPath + "/b.sav": []byte("sav b"),
		testDirPath + "/c.sav": []byte("sav c"),
	}

	for filePath, fileData := range setupFiles {
		err := afero.WriteFile(appFs, filePath, fileData, 0644)
		if err != nil {
			t.Errorf("TestListAllSaves could not create test file %s: %+v", filePath, err)
		}
	}

	var tests = []struct {
		name        string
		tokenString string
		wantCode    int
		wantResp    string
	}{
		{"Happy path, good good token and req", validToken, http.StatusOK, "[\"a.sav\",\"b.sav\",\"c.sav\"]"},
		{"Error case, user store does not exist", invalidToken, http.StatusInternalServerError, ""},
		{"Error case, missing required claims", invalidTokenMissingClaims, http.StatusBadRequest, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/save/list", nil)
			if err != nil {
				t.Errorf("%s", err.Error())
			}

			req.Header.Set("Authorization", "Bearer "+tt.tokenString)

			rr := httptest.NewRecorder()

			testconf.router.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.wantCode {
				t.Errorf("TestListAllSaves() handler returned wrong status code: got %v want %v", status, http.StatusOK)
			}

			assert.Equal(t, tt.wantResp, rr.Body.String(), "Result body does not match")
		})
	}
}
