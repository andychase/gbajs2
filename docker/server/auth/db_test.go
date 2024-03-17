package main

import (
	"strconv"
	"strings"
	"testing"

	gonanoid "github.com/matoous/go-nanoid/v2"
	uuid "github.com/satori/go.uuid"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// db test helpers
func insertTestUser(user *User, db *gorm.DB, t *testing.T) {
	err := db.Create(&user).Error
	if err != nil {
		t.Errorf("helper insertTestUser() test setup failed, db insert failed: %+v", err)
	}
}

func selectTestUser(id uint, user *User, db *gorm.DB, t *testing.T) {
	err := db.Where("id = ?", id).First(&user).Error
	if err != nil {
		t.Errorf("helper selectTestUser() test setup failed, db select failed: %+v", err)
	}
}

func insertAndSelectTestUser(db *gorm.DB, t *testing.T) *User {
	user := generateTestUser(t)
	insertTestUser(&user, db, t)
	selectTestUser(user.ID, &user, db, t)

	return &user
}

func generateTestUser(t *testing.T) User {
	newTokenId := uuid.NewV4()
	newTokenSlug := uuid.NewV4()

	hash, err := bcrypt.GenerateFromPassword([]byte("test_user_pwd"), bcrypt.DefaultCost)
	if err != nil {
		t.Errorf("helper generateTestUser() test setup failed: %+v", err)
	}

	userName, err := gonanoid.New()
	if err != nil {
		t.Errorf("helper generateTestUser() test setup failed: %+v", err)
	}

	user := User{Username: userName, PassHash: hash, TokenID: newTokenId, TokenSlug: newTokenSlug}

	return user
}

// end db test helpers

// this test should be run synchronously
func TestPgDSN(t *testing.T) {
	// env setup
	t.Setenv("PG_DB_HOST", "some_domain")
	t.Setenv("PG_DB_PORT", "5432")
	t.Setenv("PG_DB_NAME", "postgres")
	t.Setenv("PG_DB_USER", "postgres")
	t.Setenv("PG_DB_PASSWORD", "postgres")

	t.Run("Happy path, dsn matches (omitted sslmode)", func(t *testing.T) {
		wantDsn := "user=postgres password=postgres dbname=postgres host=some_domain port=5432 sslmode=disable"
		gotDsn := pgDSN()

		if gotDsn != wantDsn {
			t.Errorf("TestPgDSN() got dsn %v, wanted dsn %v", gotDsn, wantDsn)
		}
	})

	t.Setenv("PG_SSL_MODE", "require")
	t.Run("Happy path, dsn matches", func(t *testing.T) {
		wantDsn := "user=postgres password=postgres dbname=postgres host=some_domain port=5432 sslmode=require"
		gotDsn := pgDSN()

		if gotDsn != wantDsn {
			t.Errorf("TestPgDSN() got dsn %v, wanted dsn %v", gotDsn, wantDsn)
		}
	})
}

// this test should be run synchronously
func TestNewGbaJsDatabase(t *testing.T) {
	if testing.Short() {
		t.Skip()
	}

	hostAndPort := strings.Split(testconf.userDbResourceHostPost, ":")
	host := hostAndPort[0]
	port := hostAndPort[1]

	var tests = []struct {
		name      string
		dbEnv     map[string]string
		inputConf *gorm.Config
		wantDB    bool
		wantErr   bool
	}{
		{"Happy path, database exists", map[string]string{"PG_DB_HOST": host, "PG_DB_PORT": port, "PG_DB_NAME": "gbajs3", "PG_DB_USER": "postgres", "PG_DB_PASSWORD": "secret"}, &gorm.Config{}, true, false},
		{"Error case, database exists, automigrate fail on missing extension", map[string]string{"PG_DB_HOST": host, "PG_DB_PORT": port, "PG_DB_NAME": "postgres", "PG_DB_USER": "postgres", "PG_DB_PASSWORD": "secret"}, &gorm.Config{}, false, true},
		{"Error case, database does not exist", map[string]string{"PG_DB_HOST": host, "PG_DB_PORT": port, "PG_DB_NAME": "does_not_exist", "PG_DB_USER": "postgres", "PG_DB_PASSWORD": "secret"}, &gorm.Config{}, false, true},
		{"Error case, host does not exist", map[string]string{"PG_DB_HOST": "does_not_exist", "PG_DB_PORT": port, "PG_DB_NAME": "gbajs3", "PG_DB_USER": "postgres", "PG_DB_PASSWORD": "secret"}, &gorm.Config{}, false, true},
		{"Error case, port is wrong", map[string]string{"PG_DB_HOST": host, "PG_DB_PORT": "0000", "PG_DB_NAME": "gbajs3", "PG_DB_USER": "postgres", "PG_DB_PASSWORD": "secret"}, &gorm.Config{}, false, true},
		{"Error case, no env", map[string]string{}, &gorm.Config{}, false, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// env setup
			for k, v := range tt.dbEnv {
				t.Setenv(k, v)
			}

			got, gotErr := newGbaJsDatabase(tt.inputConf)
			if gotErr != nil && !tt.wantErr ||
				gotErr == nil && tt.wantErr {
				t.Errorf("TestNewGbaJsDatabase() got error %v, wanted error %v", gotErr, tt.wantErr)
			}
			if got != nil && !tt.wantDB ||
				got == nil && tt.wantDB {
				t.Errorf("TestNewGbaJsDatabase() got db %v, want db %v", got, tt.wantDB)
			}
		})
	}
}

func TestFetchUserByUsername(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip()
	}
	user := insertAndSelectTestUser(userdb, t)

	var tests = []struct {
		name     string
		username string
		want     *User
		wantErr  bool
	}{
		{"Happy path, valid username", user.Username, &User{ID: user.ID, Username: user.Username, PassHash: user.PassHash, StorageDir: user.StorageDir}, false},
		{"Error case, invalid username", "some_username", nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotErr := fetchUserByUsername(tt.username)
			if gotErr != nil && !tt.wantErr ||
				gotErr == nil && tt.wantErr {
				t.Errorf("TestFetchUserByUsername(%v) got error %v, wanted error %v", tt.username, gotErr, tt.wantErr)
			}

			assert.Equal(t, tt.want, got)
		})
	}
}

func TestUpdateUserTokenFields(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip()
	}

	user := insertAndSelectTestUser(userdb, t)
	badUser := User{}

	tmpid, err := gonanoid.Generate("123456789", 5)
	if err != nil {
		t.Errorf("TestUpdateUserTokenFields() could not parse tmpid: %+v", err)
	}

	uintId, err := strconv.ParseUint(tmpid, 10, 64)
	if err != nil {
		t.Errorf("TestUpdateUserTokenFields could not parse tmpid: %+v", err)
	}
	badUser.ID = uint(uintId)

	var tests = []struct {
		name         string
		user         *User
		newTokenId   uuid.UUID
		newTokenSlug uuid.UUID
		wantErr      bool
	}{
		{"Happy path, valid user", &User{ID: user.ID, Username: user.Username, PassHash: user.PassHash, StorageDir: user.StorageDir}, uuid.NewV4(), uuid.NewV4(), false},
		{"Happy path, valid user (token fields in struct)", &User{ID: user.ID, Username: user.Username, PassHash: user.PassHash, TokenSlug: user.TokenSlug, TokenID: user.TokenID, StorageDir: user.StorageDir}, uuid.NewV4(), uuid.NewV4(), false},
		{"Error case, invalid user", &badUser, uuid.NewV4(), uuid.NewV4(), true},
		{"Error case, invalid user (missing primary key)", &User{}, uuid.NewV4(), uuid.NewV4(), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotErr := updateUserTokenFields(tt.user, tt.newTokenId, tt.newTokenSlug)
			if gotErr != nil && !tt.wantErr ||
				gotErr == nil && tt.wantErr {
				t.Errorf("TestFetchUserByUsername(%v, %v, %v) got error %v, wanted error %v", tt.user, tt.newTokenId, tt.newTokenSlug, gotErr, tt.wantErr)
			}

			if gotErr == nil {
				var tmpUser User
				selectTestUser(tt.user.ID, &tmpUser, userdb, t)

				assert.Equal(t, tt.newTokenId, tmpUser.TokenID)
				assert.Equal(t, tt.newTokenSlug, tmpUser.TokenSlug)
			}
		})
	}
}

func TestFetchTokenSlugByTokenId(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip()
	}
	user := insertAndSelectTestUser(userdb, t)
	user2 := generateTestUser(t)
	user2.TokenSlug = uuid.Nil
	insertTestUser(&user2, userdb, t)

	var tests = []struct {
		name    string
		tokenId uuid.UUID
		want    []byte
		wantErr bool
	}{
		{"Happy path, valid query", user.TokenID, []byte(user.TokenSlug.String()), false},
		{"Error case, invalid tokenid", uuid.NewV4(), nil, true},
		{"Error case, user exists but has nil tokenid", user2.TokenID, nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotErr := fetchTokenSlugByTokenId(tt.tokenId.String())
			if gotErr != nil && !tt.wantErr ||
				gotErr == nil && tt.wantErr {
				t.Errorf("TestFetchTokenSlugByTokenId(%s) got error %v, wanted error %v", tt.tokenId.String(), gotErr, tt.wantErr)
			}

			assert.Equal(t, tt.want, got)
		})
	}
}
