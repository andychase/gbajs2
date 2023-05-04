package main

import (
	"net/http"
)

// Route structure of a single route
type Route struct {
	method  string
	pattern string
	handler http.HandlerFunc
}

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
