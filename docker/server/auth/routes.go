package main

import (
	gz "github.com/NYTimes/gziphandler"
	"github.com/gorilla/mux"
	"net/http"
)

var no_auth_routes = map[string]bool{
	"/api/account/login":  true,
	"/api/tokens/refresh": true,
}

// app routes
var ROUTES = Routes{
	Route{
		method:  "GET",
		pattern: "/",
		handler: helloWorld,
	},

	// auth paths
	Route{
		method:  "POST",
		pattern: "/api/account/login",
		handler: login,
	},
	Route{
		method:  "POST",
		pattern: "/api/account/logout",
		handler: logout,
	},
	Route{
		method:  "POST",
		pattern: "/api/tokens/refresh",
		handler: tokenRefresh,
	},

	// gba paths
	Route{
		method:  "GET",
		pattern: "/api/save/download",
		handler: downloadSave,
	},
	Route{
		method:  "POST",
		pattern: "/api/save/upload",
		handler: uploadSave,
	},
	Route{
		method:  "GET",
		pattern: "/api/rom/download",
		handler: downloadRom,
	},
	Route{
		method:  "POST",
		pattern: "/api/rom/upload",
		handler: uploadRom,
	},
	Route{
		method:  "GET",
		pattern: "/api/rom/list",
		handler: listAllRoms,
	},
	Route{
		method:  "GET",
		pattern: "/api/save/list",
		handler: listAllSaves,
	},
}

func addRoutes(router *mux.Router, routes Routes) {
	for _, route := range routes {
		if !no_auth_routes[route.pattern] { // path requires authorization
			// add authorization middleware
			route.handler = authorize(route.handler).(http.HandlerFunc)
		}

		// default gzip middleware if accepted
		route.handler = gz.GzipHandler(route.handler).(http.HandlerFunc)

		router.Handle(route.pattern, route.handler).Methods(route.method)
	}
}
