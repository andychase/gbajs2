#first stage - builder
FROM golang:alpine as builder
WORKDIR /app/
RUN apk add --update gcc g++
COPY ./server/auth /app/
ENV GO111MODULE=on
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o authserver

#second stage
FROM alpine:latest
WORKDIR /app/
COPY --from=builder /app/authserver .
COPY --from=builder /app/certs ./certs
CMD ["./authserver"]
