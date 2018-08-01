FROM golang:alpine as builder

RUN mkdir -p /go/src/github.com/christianalexander/socklive
WORKDIR /go/src/github.com/christianalexander/socklive

COPY . .

RUN CGO_ENABLED=0 go build -o /bin/socklive

FROM alpine

COPY --from=builder /bin/socklive /socklive

COPY static /static

ENTRYPOINT ["/socklive"]
