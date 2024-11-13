# first stage - builder
FROM golang:alpine AS builder
WORKDIR /app/
COPY . /app/
ENV GO111MODULE=on
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-w -s' -o authserver

# second stage
FROM alpine:latest

LABEL org.opencontainers.image.source https://github.com/thenick775/gbajs3

WORKDIR /app/
COPY --from=builder /app/authserver .
CMD ["./authserver"]
