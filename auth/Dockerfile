# first stage - builder
FROM golang:alpine AS builder
WORKDIR /app/
COPY . /app/
ENV GO111MODULE=on
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-w -s' -o authserver

# second stage
FROM alpine:latest
WORKDIR /app/
COPY --from=builder /app/authserver .
CMD ["./authserver"]
