# Getting started

## Required env

```
CLIENT_HOST=https://localhost

# postgres
PG_DB_HOST=localhost
PG_DB_USER=postgres
PG_DB_PASSWORD=postgres
PG_DB_NAME=gbajs3
PG_DB_PORT=5432
PG_SSL_MODE=disable
```

## Required directories/files

You will need to create the following directories:

```
./data/local_roms/
./data/auth/local_saves/
```

Then add your certificate files at:

```
./certs/fullchain.pem
./certs/privkey.pem
```

## Running the app

To run the api locally, use the following command

```
go run .
```

# Testing

Due to some limitations of afero at thie time, using the OS file system flag will run additional error case tests against the file system, these are currently skipped when using MemMapfs.

For full testing and coverage use the following command (requires docker for database integration tests):

```
go test --v --cover --useosfs --race ./...
```

To test using a memory mapped file system use:

```
go test --v --cover --race ./...
```

To skip integration tests, use:

```
go test --v --cover --race --short ./...
```
