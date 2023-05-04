# GoAdmin Instruction

GoAdmin is a golang framework help gopher quickly build a data visualization platform. 

- [github](https://github.com/GoAdminGroup/go-admin)
- [forum](http://discuss.go-admin.com)
- [document](https://book.go-admin.cn)

## Directories Introduction

```
.
├── Dockerfile          Dockerfile
├── Makefile            Makefile
├── adm.ini             adm config
├── admin.db            sqlite database
├── build               binary build target folder
├── config.json         config file
├── go.mod              go.mod
├── go.sum              go.sum
├── html                frontend html files
├── logs                logs
├── main.go             main.go
├── main_test.go        ci test
├── pages               page controllers
├── tables              table models
└── uploads             upload files
```

## Generate Table Model

### online tool

visit: http://127.0.0.1:80/admin/info/generate/new

### use adm

```
adm generate
```

