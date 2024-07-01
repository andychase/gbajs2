package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"testing"

	"github.com/gorilla/mux"
	"github.com/ory/dockertest"
	uuid "github.com/satori/go.uuid"
	"github.com/spf13/afero"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type TestConf struct { //testing specific flags and variables
	useOsFs                *bool
	router                 *mux.Router
	userDbResourceHostPost string
}

var testconf TestConf

func setupDb() (*dockertest.Pool, *dockertest.Resource, string) {
	// db setup
	pool, err := dockertest.NewPool("")
	if err != nil {
		log.Fatalf("Could not connect to docker: %+v", err)
	}

	resource, err := pool.Run("postgres", "15.2", []string{"POSTGRES_PASSWORD=secret", "POSTGRES_DB=gbajs3"})
	if err != nil {
		log.Fatalf("Could not start resource: %+v", err)
	}

	var userDbResourceHostPost string
	if err = pool.Retry(func() error {
		var err error

		userDbResourceHostPost = resource.GetHostPort("5432/tcp")
		connectionString := fmt.Sprintf("postgres://postgres:secret@%s/gbajs3?sslmode=disable", userDbResourceHostPost)

		userdb, err = gorm.Open(postgres.Open(connectionString), &gorm.Config{})
		if err != nil {
			return err
		}

		sqlDB, err := userdb.DB()
		if err != nil {
			return err
		}

		return sqlDB.Ping()
	}); err != nil {
		log.Println("Waiting for docker db connnection: ", err)
	}
	log.Println("test database connection established")

	userdb.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")

	err = userdb.AutoMigrate(&User{})
	if err != nil {
		log.Println("Error automigrate has failed ", err)
	}

	return pool, resource, userDbResourceHostPost
}

func setupFS(basePath string, useOsFs bool) {
	if useOsFs {
		appFs = afero.NewBasePathFs(afero.NewOsFs(), basePath)

		err := cleanupTestOsFs()
		if err != nil {
			log.Println("failed to clear os fs test directory", err)
		}
	} else {
		// ideal for test cases, but not fully 1-1 yet with error cases
		appFs = afero.NewBasePathFs(afero.NewMemMapFs(), basePath)
	}

	// required directories
	appFs.MkdirAll("/local_roms/", 0755)
	appFs.MkdirAll("/local_saves/", 0755)
}

func cleanupTestOsFs() error {
	err := appFs.RemoveAll("./")
	if err != nil {
		log.Println("failed to clear os fs test directory", err)
	}
	return err
}

func setupTokenKey() {
	accessSignKey = uuid.NewV4().Bytes()
}

func setuptestrouter() *mux.Router {
	testRouter := mux.NewRouter().StrictSlash(false)
	addRoutes(testRouter, ROUTES)

	return testRouter
}

func TestMain(m *testing.M) {
	var (
		pool     *dockertest.Pool
		resource *dockertest.Resource
	)

	testconf.useOsFs = flag.Bool("useosfs", false, "run tests against an os fs instead of memory mapped fs")
	flag.Parse()
	if !testing.Short() {
		pool, resource, testconf.userDbResourceHostPost = setupDb()
	}
	testconf.router = setuptestrouter()
	setupTokenKey()
	setupFS("./test_data", *testconf.useOsFs)

	tests := m.Run()

	if !testing.Short() {
		if err := pool.Purge(resource); err != nil {
			log.Fatalf("Could not purge resource: %s", err)
		}
	}

	if *testconf.useOsFs {
		err := cleanupTestOsFs()
		if err != nil {
			log.Println("failed to clear os fs test directory", err)
		}
	}

	os.Exit(tests)
}
