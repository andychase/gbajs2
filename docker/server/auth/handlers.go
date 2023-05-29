package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"
)

// @Summary Hello world landing page
// @Description Displays welcome message.
// @Produce plain
// @Param Authorization header string true "Bearer Token"
// @Success 200 {string} string "Hello World! This is a GBA file/auth server, written in Golang."
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router / [get]
func helloWorld(w http.ResponseWriter, r *http.Request) { // intro message to show connection was established
	fmt.Fprintf(w, "Hello World! This is a GBA file/auth server, written in Golang.")
}

// @Summary Download save from server
// @Tags gba
// @Description Download save from server
// @Produce application/x-spss-sav
// @Param Authorization header string true "Bearer Token"
// @Param save query string true "Save to download" example(unbound.sav)
// @Success 200 {string} string
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router /api/save/download [get]
func downloadSave(w http.ResponseWriter, r *http.Request) {
	fname := r.URL.Query().Get("save")
	if fname == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	storePath, err := getStorePathFromClaims(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	data, err := readFileData(savePath + storePath + fname)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Add("Content-Type", "application/x-spss-sav")
	http.ServeContent(w, r, fname, time.Now(), bytes.NewReader(data))
}

// @Summary Download rom from server
// @Tags gba
// @Description Download rom from server
// @Produce application/x-gba-rom
// @Param Authorization header string true "Bearer Token"
// @Param rom query string true "Rom to download" example(unbound.gba)
// @Success 200 {string} string
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router /api/rom/download [get]
func downloadRom(w http.ResponseWriter, r *http.Request) {
	fname := r.URL.Query().Get("rom")
	if fname == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	storePath, err := getStorePathFromClaims(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	data, err := readFileData(romPath + storePath + fname)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Add("Content-Type", "application/x-gba-rom")
	http.ServeContent(w, r, fname, time.Now(), bytes.NewReader(data))
}

// @Summary Upload rom to server
// @Tags gba
// @Description Upload rom to server
// @Param Authorization header string true "Bearer Token"
// @Param rom formData file true "Rom to Upload"
// @Success 200 {string} string
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router /api/rom/upload [post]
func uploadRom(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 50<<20+1024)

	file, handler, err := r.FormFile("rom")
	if err != nil {
		log.Println("Error Retrieving the formFile")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer file.Close()

	if filepath.Ext(handler.Filename) != ".gba" &&
		filepath.Ext(handler.Filename) != ".gbc" &&
		filepath.Ext(handler.Filename) != ".gb" {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "File not in gba format, expected extentions are .gba/.gbc/.gb")
		return
	}

	storePath, err := getStorePathFromClaims(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	err = createOrOverwriteFileIfNotExists(romPath+storePath+handler.Filename, file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

// @Summary Upload save to server
// @Tags gba
// @Description Upload save to server
// @Param Authorization header string true "Bearer Token"
// @Param save formData file true "Save to Upload"
// @Success 200 {string} string
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router /api/save/upload [post]
func uploadSave(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 50<<20+1024)

	file, handler, err := r.FormFile("save")
	if err != nil {
		log.Println("Error Retrieving the formFile")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer file.Close()

	storePath, err := getStorePathFromClaims(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	err = createOrOverwriteFileIfNotExists(savePath+storePath+handler.Filename, file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

// @Summary Lists all rom files uploaded to server
// @Tags gba
// @Description Lists all roms uploaded to server
// @Produce json
// @Param Authorization header string true "Bearer Token"
// @Success 200 {string} string
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router /api/rom/list [get]
func listAllRoms(w http.ResponseWriter, r *http.Request) {
	storePath, err := getStorePathFromClaims(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	fileNames, err := fileNamesFromDirPath(romPath + storePath)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	resp, err := json.Marshal(fileNames)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

// @Summary Lists all save files uploaded to server
// @Tags gba
// @Description Lists all saves uploaded to server
// @Produce json
// @Param Authorization header string true "Bearer Token"
// @Success 200 {string} string
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router /api/save/list [get]
func listAllSaves(w http.ResponseWriter, r *http.Request) {
	storePath, err := getStorePathFromClaims(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	fileNames, err := fileNamesFromDirPath(savePath + storePath)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	resp, err := json.Marshal(fileNames)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}
