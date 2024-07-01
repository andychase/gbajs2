package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"

	_ "github.com/GoAdminGroup/go-admin/adapter/gorilla"             // web framework adapter
	_ "github.com/GoAdminGroup/go-admin/modules/db/drivers/postgres" // sql drivers
	_ "github.com/GoAdminGroup/themes/adminlte"
	_ "github.com/GoAdminGroup/themes/sword" // ui themes

	"github.com/GoAdminGroup/go-admin/engine"
	"github.com/GoAdminGroup/go-admin/template"
	"github.com/GoAdminGroup/go-admin/template/chartjs"
	"github.com/gorilla/mux"

	"bin/conf"
	"bin/models"
	"bin/tables"
)

func main() {
	startServer()
}

func startServer() {
	log.Println("admin server started")
	const certLoc = "./certs/fullchain.pem"
	const keyLoc = "./certs/privkey.pem"

	app := mux.NewRouter()

	template.AddComp(chartjs.NewChart())

	eng := engine.Default()

	cfg := conf.NewAppConf()

	if err := eng.AddConfig(&cfg).
		AddGenerators(tables.Generators).
		Use(app); err != nil {
		panic(err)
	}

	// TODO: gbajs3 specific dashboard
	// eng.HTML("GET", "/admin", pages.GetDashBoard)
	eng.HTMLFile("GET", "/admin", "./html/welcome.tmpl", map[string]interface{}{
		"msg": "Welcome to the gbsJS3 Admin",
	})

	models.Init(eng.PostgresqlConnection())

	go func() {
		log.Println("handling requests initiated")
		log.Fatal(http.ListenAndServeTLS(":443", certLoc, keyLoc, app))
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	log.Print("closing database connection")
	eng.PostgresqlConnection().Close()
}
