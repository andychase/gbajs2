# first stage - builder
FROM golang:alpine as builder
WORKDIR /app/
COPY ./server/admin /app/
RUN apk update && apk add make
ENV GO111MODULE=on
RUN go mod download
RUN make build

# second stage
FROM alpine:latest
WORKDIR /app/
COPY --from=builder /app/build/goadmin .
COPY --from=builder /app/html/ ./html
RUN mkdir ./logs
CMD ["./goadmin"]
