FROM golang:alpine as builder

RUN apk add --no-cache nodejs

COPY frontend /frontend
RUN cd /frontend && npm install && npm run build

RUN mkdir -p /go/src/github.com/christianalexander/socklive
WORKDIR /go/src/github.com/christianalexander/socklive

COPY . .

RUN CGO_ENABLED=0 go build -o /bin/socklive

FROM alpine

COPY --from=builder /bin/socklive /socklive

COPY --from=builder /static /static
COPY static/index.html /static/index.html

ENTRYPOINT ["/socklive"]
