package conf

import (
	"fmt"
	"github.com/GoAdminGroup/go-admin/modules/config"
	"github.com/GoAdminGroup/go-admin/modules/language"
	"net/url"
	"os"
	"strings"
	"time"
)

func NewAppConf() config.Config {
	appID, clientDomain, dbHost, gbajsDsn, adminDsn := getValuesFromEnv()

	return config.Config{
		Env: config.EnvProd,
		Databases: config.DatabaseList{
			"default": {
				Host:            dbHost,
				Dsn:             adminDsn,
				Driver:          config.DriverPostgresql,
				MaxIdleConns:    5,
				MaxOpenConns:    10,
				ConnMaxLifetime: time.Hour,
			},
			"gbajs3": {
				Host:            dbHost,
				Dsn:             gbajsDsn,
				Driver:          config.DriverPostgresql,
				MaxIdleConns:    15,
				MaxOpenConns:    30,
				ConnMaxLifetime: time.Hour,
			},
		},
		AppID:                appID,
		Domain:               clientDomain,
		UrlPrefix:            "admin",
		Theme:                "sword",
		Title:                "gbajs3-admin",
		Logo:                 "gba<b>JS3</b>",
		MiniLogo:             "<b>G</b>J3",
		IndexUrl:             "/",
		LoginUrl:             "/login",
		OperationLogOff:      true,
		AllowDelOperationLog: true,
		InfoLogPath:          "./logs/info.log",
		ErrorLogPath:         "./logs/error.log",
		AccessLogPath:        "./logs/access.log",
		SessionLifeTime:      7200,
		LoginTitle:           "gbaJS3 Admin",
		LoginLogo:            "gbaJS3",
		AuthUserTable:        "goadmin_users",
		BootstrapFilePath:    "./bootstrap.go",
		GoModFilePath:        "./go.mod",
		AssetRootPath:        "./public/",
		URLFormat: config.URLFormat{
			Info:       "/info/:__prefix",
			Detail:     "/info/:__prefix/detail",
			Create:     "/new/:__prefix",
			Delete:     "/delete/:__prefix",
			Export:     "/export/:__prefix",
			Edit:       "/edit/:__prefix",
			ShowEdit:   "/info/:__prefix/edit",
			ShowCreate: "/info/:__prefix/new",
			Update:     "/update/:__prefix",
		},
		Debug:              false,
		Language:           language.EN,
		HideToolEntrance:   true,
		HidePluginEntrance: true,
		CustomHeadHtml: `<style>
 #pjax-container > section.content > div > div > div.box-body > table {
     min-width: 100px !important;
 }

 #pjax-container > section.content > div > div > div.box-body {
     overflow-x: auto;
 }
</style>`,
	}
}

func getValuesFromEnv() (appID, clientDomain, dbHost, gbajsdsn, admindsn string) {
	appID = os.Getenv("APP_ID")
	dbHost = os.Getenv("PG_DB_HOST")
	dbPort := os.Getenv("PG_DB_PORT")
	gbajsDBName := os.Getenv("GBAJS_DB_NAME")
	adminDBName := os.Getenv("ADMIN_DB_NAME")
	dbUser := os.Getenv("PG_DB_USER")
	dbPassword := os.Getenv("PG_DB_PASSWORD")
	dbSSLMode := os.Getenv("PG_SSL_MODE")
	clientHost := os.Getenv("CLIENT_HOST")

	if strings.TrimSpace(dbSSLMode) == "" {
		dbSSLMode = "disable"
	}

	clientDomain, _ = domainFromUrl(clientHost)
	gbajsdsn = fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=%s", dbUser, dbPassword, gbajsDBName, dbHost, dbPort, dbSSLMode)
	admindsn = fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=%s", dbUser, dbPassword, adminDBName, dbHost, dbPort, dbSSLMode)

	return
}

// returns domain from url, if invalid, returns original input
func domainFromUrl(input string) (string, error) {
	url, err := url.Parse(input)
	if err != nil {
		return input, err
	}
	// optionally strip prefix
	hostname := strings.TrimPrefix(url.Hostname(), "www.")

	return hostname, nil
}
