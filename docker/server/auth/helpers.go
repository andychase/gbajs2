package main

import (
	"context"
	"errors"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"io"
	"mime/multipart"
	"os"
)

// context helpers
// returns store claim from context
func getStorePathFromClaims(ctx context.Context) (string, error) {
	claims, ok := ctx.Value("claims").(jwt.MapClaims)

	if !ok {
		return "", fmt.Errorf("error converting to claims to mapclaims")
	}

	store, ok := claims["store"].(string)
	if !ok {
		return "", fmt.Errorf("no store in context")
	}

	storePath := store + "/"

	return storePath, nil
}

// file handling helpers
// takes in a directory path, creates if not exists
func createDirectoryIfNotExists(dirPath string) error {
	if _, err := os.Stat(dirPath); errors.Is(err, os.ErrNotExist) {
		err := os.Mkdir(dirPath, os.ModePerm)
		if err != nil {
			return err
		}
	}

	return nil
}

// takes in a file path, and creates if not exists or overwrites
func createOrOverwriteFileIfNotExists(filePath string, file multipart.File) error {
	if _, err := os.Stat(filePath); err == nil {
		// path/to/whatever exists
		f, err := os.OpenFile(filePath, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0755)
		if err != nil {
			return err
		}
		defer f.Close()
		io.Copy(f, file)
	} else if errors.Is(err, os.ErrNotExist) {
		// path/to/whatever does *not* exist
		f, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE, 0666)
		if err != nil {
			return err
		}
		defer f.Close()
		io.Copy(f, file)
	} else {
		// Schrodinger: file may or may not exist. See err for details.
		return err
	}

	return nil
}

// returns names of all files in a directory as an array of strings
func fileNamesFromDirPath(dirPath string) ([]string, error) {
	files, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	fileNames := []string{}
	for _, file := range files {
		fileNames = append(fileNames, file.Name())
	}

	return fileNames, nil
}

// reads file data from disk
func readFileData(filePath string) ([]byte, error) {
	data, err := os.ReadFile(filePath)

	if err != nil {
		err = fmt.Errorf("error reading file data: %w", err)
		return nil, err
	}

	return data, nil
}
