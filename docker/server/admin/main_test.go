package main

import (
	"bin/tables"
	"github.com/GoAdminGroup/go-admin/modules/config"
	"github.com/GoAdminGroup/go-admin/tests"
	"github.com/GoAdminGroup/go-admin/tests/common"
	"github.com/GoAdminGroup/go-admin/tests/frameworks/gin"
	"github.com/GoAdminGroup/go-admin/tests/web"
	"github.com/gavv/httpexpect"
	"log"
	"testing"
)

// Black box testing
func TestMainBlackBox(t *testing.T) {
	cfg := config.ReadFromJson("./config_test.json")
	tests.BlackBoxTestSuit(t, gin.NewHandler, cfg.Databases, tables.Generators, func(cfg config.DatabaseList) {
		// Data cleaner of the framework
		tests.Cleaner(cfg)
		// Clean your own data:
		// ...
	}, func(e *httpexpect.Expect) {
		// Test cases of the framework
		common.Test(e)
		// Write your own API test, for example:
		// More usages: https://github.com/gavv/httpexpect
		// e.POST("/signin").Expect().Status(http.StatusOK)
	})
}

// User acceptance testing
func TestMainUserAcceptance(t *testing.T) {
	web.UserAcceptanceTestSuit(t, func(t *testing.T, page *web.Page) {
		// Write test case base on chromedriver, for example:
		// More usages: https://github.com/sclevine/agouti
		page.NavigateTo("http://127.0.0.1:9033/admin")
		//page.Contain("username")
		//page.Click("")
	}, func(quit chan struct{}) {
		// start the server:
		// ....
		go startServer()
		<-quit
		log.Print("test quit")
	}, true) // if local parameter is true, it will not be headless, and window not close when finishing tests.
}
