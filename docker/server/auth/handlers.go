package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// @Summary Hello world landing page
// @Description Displays welcome message.
// @Produce  plain
// @Param authToken header string true "Authorization"
// @Success 200 {string} string "Hello World! This is a GBA file/auth server, written in Golang."
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router / [get]
func helloWorld(w http.ResponseWriter, r *http.Request) { //intro message to show connection was established
	fmt.Fprintf(w, "Hello World! This is a GBA file/auth server, written in Golang.")
}

// @Summary Download save from server
// @Tags gba
// @Description Download save from server
// @Produce application/x-spss-sav
// @Param authToken header string true "Authorization"
// @Param save query string true "Save to download"
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
	data, err := ioutil.ReadFile(savePath + fname)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	http.ServeContent(w, r, fname, time.Now(), bytes.NewReader(data))
}

// @Summary Download rom from server
// @Tags gba
// @Description Download rom from server
// @Produce application/x-gba-rom
// @Param authToken header string true "Authorization"
// @Param rom query string true "Rom to download"
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
	data, err := ioutil.ReadFile(romPath + fname)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	http.ServeContent(w, r, fname, time.Now(), bytes.NewReader(data))
}

// @Summary Upload rom to server
// @Tags gba
// @Description Upload rom to server
// @Param authToken header string true "Authorization"
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
		fmt.Println("Error Retrieving the formFile")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer file.Close()

	if filepath.Ext(handler.Filename) != ".gba" {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "File not in gba format, expected extention is .gba")
		return
	}

	if _, err := os.Stat(romPath + handler.Filename); err == nil {
		// path/to/whatever exists
		f, err := os.OpenFile(romPath+handler.Filename, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0755)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		defer f.Close()
		io.Copy(f, file)
	} else if errors.Is(err, os.ErrNotExist) {
		// path/to/whatever does *not* exist
		f, err := os.OpenFile(romPath+handler.Filename, os.O_WRONLY|os.O_CREATE, 0666)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		defer f.Close()
		io.Copy(f, file)
	} else {
		// Schrodinger: file may or may not exist. See err for details.
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

// @Summary Upload save to server
// @Tags gba
// @Description Upload save to server
// @Param authToken header string true "Authorization"
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
		fmt.Println("Error Retrieving the formFile")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer file.Close()

	if _, err := os.Stat(savePath + handler.Filename); err == nil {
		// path/to/whatever exists
		f, err := os.OpenFile(savePath+handler.Filename, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0755)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		defer f.Close()
		io.Copy(f, file)
	} else if errors.Is(err, os.ErrNotExist) {
		// path/to/whatever does *not* exist
		f, err := os.OpenFile(savePath+handler.Filename, os.O_WRONLY|os.O_CREATE, 0666)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		defer f.Close()
		io.Copy(f, file)
	} else {
		// Schrodinger: file may or may not exist. See err for details.
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

// @Summary Lists all rom files uploaded to server
// @Tags gba
// @Description Lists all roms uploaded to server
// @Produce json
// @Param authToken header string true "Authorization"
// @Success 200 {string} string
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router /api/rom/list [get]
func listAllRoms(w http.ResponseWriter, r *http.Request) {
	files, err := ioutil.ReadDir(romPath)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	res := []string{}

	for _, file := range files {
		res = append(res, file.Name())
	}

	resp, err := json.Marshal(res)
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
// @Param authToken header string true "Authorization"
// @Success 200 {string} string
// @Failure 401 {string} string
// @Failure 405 {string} string
// @Failure 500 {string} string
// @Failure 501 {string} string
// @Router /api/save/list [get]
func listAllSaves(w http.ResponseWriter, r *http.Request) {
	files, err := ioutil.ReadDir(savePath)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	res := []string{}

	for _, file := range files {
		res = append(res, file.Name())
	}

	resp, err := json.Marshal(res)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}
