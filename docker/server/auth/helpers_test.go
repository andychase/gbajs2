package main

import (
	"bytes"
	"context"
	"os"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	uuid "github.com/satori/go.uuid"
	"github.com/spf13/afero"
	"github.com/stretchr/testify/assert"
)

func TestGetStorePathFromClaims(t *testing.T) {
	t.Parallel()
	ctx := context.Background()

	var tests = []struct {
		name    string
		ctx     context.Context
		want    string
		wantErr bool
	}{
		{"Happy path, good context", context.WithValue(ctx, "claims", jwt.MapClaims{"store": uuid.Must(uuid.FromString("123e4567-e89b-12d3-a456-426655440000")).String()}), "123e4567-e89b-12d3-a456-426655440000/", false},
		{"Error case, context claims missing required value", context.WithValue(ctx, "claims", jwt.MapClaims{}), "", true},
		{"Error case, context missing claims", ctx, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotErr := getStorePathFromClaims(tt.ctx)
			if gotErr != nil && !tt.wantErr ||
				gotErr == nil && tt.wantErr {
				t.Errorf("TestGetStorePathFromClaims(%v) got error %v, wanted error %v", tt.ctx, gotErr, tt.wantErr)
			}

			assert.Equal(t, tt.want, got)
		})
	}
}

func TestCreateDirectoryIfNotExists(t *testing.T) {
	t.Parallel()

	testDirPath := "/testdir_create_directory_if_not_exists"
	appFs.MkdirAll(testDirPath, 0755)
	testDirPathMissingParent := "/not_exists/testdir_create_directory_if_not_exists"
	testFile := testDirPath + "/a.txt"
	err := afero.WriteFile(appFs, testFile, []byte("file a"), 0644)
	if err != nil {
		t.Errorf("could not write test file %s: %+v", testFile, err)
	}

	var tests = []struct {
		name                       string
		newDirPath                 string
		wantErr                    bool
		expectedToFailWithMemMapFs bool
	}{
		{"Happy path, good dirPath", testDirPath, false, false},
		{"Happy path, good dirPath (dirpath already exists)", testDirPath, false, false},
		// NOTE: error cases do not yet work correctly in afero with memmap fs
		//       these tests will fail on the os fs, hopefully to be fixed in a future release
		{"Error case, dirPath parent does not exist", testDirPathMissingParent, true, true},
		{"Error path, dirpath is a subdirectory of a file", testFile + "/b", true, true},
		// NOTE: these cases dont return errors for osfs either
		//{"Error case, dirPath is empty", "", true},
		//{"Error path, dirpath is an existing file path", testFile, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// skip if expected to fail with memmapfs and using memmapfs
			if !(*testconf.useOsFs) && tt.expectedToFailWithMemMapFs {
				t.Skip()
			}

			gotErr := createDirectoryIfNotExists(tt.newDirPath)
			if (gotErr != nil && !tt.wantErr) ||
				(gotErr == nil && tt.wantErr) {
				t.Errorf("TestCreateDirectoryIfNotExists(%v) got error %v, wanted error %v", tt.newDirPath, gotErr, tt.wantErr)
			}

			if _, checkErr := appFs.Stat(tt.newDirPath); !tt.wantErr && os.IsNotExist(checkErr) {
				t.Errorf("TestCreateDirectoryIfNotExists(%v) got error %v, want %v", tt.newDirPath, checkErr, tt.newDirPath)
			}
		})
	}
}

func TestCreateOrOverwriteFileIfNotExists(t *testing.T) {
	t.Parallel()

	testDirPath := "/testdir_overwrite_or_create_file"
	testSubDirPath := "/sub_dir"
	testFileNameNotExists := "/a.txt"
	testFileNameExists := "/b.txt"

	appFs.MkdirAll(testDirPath, 0755)
	afero.WriteFile(appFs, testDirPath+testFileNameExists, []byte("file b"), 0644)
	appFs.Mkdir(testDirPath+testSubDirPath, os.ModePerm)

	var tests = []struct {
		name                       string
		filePath                   string
		fileName                   string
		wantBytes                  []byte
		wantErr                    bool
		wantOpenErr                bool
		expectedToFailWithMemMapFs bool
	}{
		{"Happy path, filePath does not exist", testDirPath, testFileNameNotExists, []byte("file a"), false, false, false},
		{"Happy path, filePath exists", testDirPath, testFileNameExists, []byte("file b updated"), false, false, false},
		// NOTE: error cases do not yet work correctly in afero with memmap fs
		//       these tests will pass on the os fs, hopefully to be fixed in a future release
		{"Error case, filePath is empty", "", "", []byte{}, true, true, true},
		{"Error case, filePath is a dirpath", testDirPath + testSubDirPath, "", []byte{}, true, true, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// skip if expected to fail with memmapfs and using memmapfs
			if !(*testconf.useOsFs) && tt.expectedToFailWithMemMapFs {
				t.Skip()
			}

			// mocking with an io.Reader from a byte slice in this case
			r := bytes.NewReader(tt.wantBytes)

			gotErr := createOrOverwriteFileIfNotExists(tt.filePath+tt.fileName, r)
			if gotErr != nil && !tt.wantErr ||
				gotErr == nil && tt.wantErr {
				t.Errorf("TestCreateOrOverwriteFileIfNotExists(%v, %v) got error %v, wanted error %v", tt.filePath+tt.fileName, r, gotErr, tt.wantErr)
			}

			// read file
			got, openErr := afero.ReadFile(appFs, tt.filePath+tt.fileName)
			if openErr != nil && !tt.wantOpenErr ||
				openErr == nil && tt.wantOpenErr {
				t.Errorf("TestCreateOrOverwriteFileIfNotExists(%v, %v) err opening file %v, want err %v", tt.filePath+tt.fileName, r, openErr, tt.wantOpenErr)
			}

			// compare contents
			assert.Equal(t, tt.wantBytes, got)
		})
	}
}

func TestFileNamesFromDirPath(t *testing.T) {
	t.Parallel()

	testDirPath := "/testdir_file_names_from_dirpath"
	testEmptyFilePath := testDirPath + "_empty"
	testDirPathNotExists := "/derp"

	setupDirs := []string{testDirPath, testEmptyFilePath}
	setupFiles := map[string][]byte{
		testDirPath + "/a.txt": []byte("file a"),
		testDirPath + "/b.txt": []byte("file b"),
		testDirPath + "/c.txt": []byte("file c"),
	}

	for _, dir := range setupDirs {
		err := appFs.MkdirAll(dir, 0755)
		if err != nil {
			t.Errorf("TestFileNamesFromDirPath could not create test directory %s: %+v", dir, err)
		}
	}

	for filePath, fileData := range setupFiles {
		err := afero.WriteFile(appFs, filePath, fileData, 0644)
		if err != nil {
			t.Errorf("TestFileNamesFromDirPath could not create test file %s: %+v", filePath, err)
		}
	}

	var tests = []struct {
		name    string
		dirPath string
		want    []string
		wantErr bool
	}{
		{"Happy path, good dirPath (contains files)", testDirPath, []string{"a.txt", "b.txt", "c.txt"}, false},
		{"Happy path, good dirPath (no files)", testEmptyFilePath, []string{}, false},
		{"Error case, dirPath does not exist", testDirPathNotExists, nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotErr := fileNamesFromDirPath(tt.dirPath)
			if gotErr != nil && !tt.wantErr ||
				gotErr == nil && tt.wantErr {
				t.Errorf("TestFileNamesFromDirPath(%v) got error %v, wanted error %v", tt.dirPath, gotErr, tt.wantErr)
			}

			assert.Equal(t, tt.want, got)
		})
	}
}

func TestReadFileData(t *testing.T) {
	t.Parallel()

	testDirPath := "/testdir_read_file_data"
	testFile := testDirPath + "/a.txt"
	testDirPathNotExists := testDirPath + "/b.txt"

	err := appFs.MkdirAll(testDirPath, 0755)
	if err != nil {
		t.Errorf("TestReadFileData could not create test directory %s: %+v", testDirPath, err)
	}

	err = afero.WriteFile(appFs, testFile, []byte("file a"), 0644)
	if err != nil {
		t.Errorf("TestReadFileData could not write test file %s: %+v", testFile, err)
	}

	var tests = []struct {
		name                       string
		filePath                   string
		wantBytes                  []byte
		wantErr                    bool
		expectedToFailWithMemMapFs bool
	}{
		{"Happy path, good filePath with good data", testFile, []byte("file a"), false, false},
		{"Error case, filePath does not exist", testDirPathNotExists, nil, true, false},
		// NOTE: error cases do not yet work correctly in afero with memmap fs
		//       these tests will pass on the os fs, hopefully to be fixed in a future release
		{"Error case, filePath is empty", "", nil, true, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// skip if expected to fail with memmapfs and using memmapfs
			if !(*testconf.useOsFs) && tt.expectedToFailWithMemMapFs {
				t.Skip()
			}

			got, gotErr := readFileData(tt.filePath)
			if gotErr != nil && !tt.wantErr ||
				gotErr == nil && tt.wantErr {
				t.Errorf("TestReadFileData(%v) got error %v, wanted error %v", tt.filePath, gotErr, tt.wantErr)
			}

			assert.Equal(t, tt.wantBytes, got)
		})
	}
}
