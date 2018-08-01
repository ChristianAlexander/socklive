package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/sirupsen/logrus"
	"golang.org/x/net/websocket"
)

func main() {
	ticker := time.NewTicker(time.Millisecond * 500)

	fs := http.FileServer(http.Dir("static"))
	http.Handle("/", fs)
	http.Handle("/socket", websocket.Handler(socketHandler(ticker)))

	logrus.Infoln("Starting SockLive server on port 8080")
	logrus.Fatalf("Server closed: %v", http.ListenAndServe(":8080", nil))
}

type wsMessage struct {
	Type string      `json:"type"`
	ID   string      `json:"id,omitempty"`
	Body interface{} `json:"body"`
}

func (m *wsMessage) UnmarshalJSON(b []byte) error {
	var rawMessage struct {
		Type string `json:"type"`
		ID   string `json:"id,omitempty"`
		Body json.RawMessage
	}
	err := json.Unmarshal(b, &rawMessage)
	if err != nil {
		return fmt.Errorf("could not unmarshal message as rawMessage: %v", err)
	}

	m.Type = rawMessage.Type
	m.ID = rawMessage.ID

	switch rawMessage.Type {
	case "delayRequest":
		{
			var dr delayRequestBody
			err := json.Unmarshal(rawMessage.Body, &dr)
			if err != nil {
				return fmt.Errorf("could not unmarshal body as delayRequestBody: %v", err)
			}
			now := time.Now()
			dr.ServerReceivedTime = &now
			m.Body = dr
		}
	}
	return nil
}

type syncMessage struct {
	Time string `json:"time"`
}

func makeSyncMessage() *wsMessage {
	return &wsMessage{
		Type: "sync",
		Body: syncMessage{
			Time: time.Now().UTC().Format(time.RFC3339Nano),
		},
	}
}

type delayRequestBody struct {
	ReceivedValue      string `json:"receivedValue"`
	ReceivedTime       string `json:"receivedTime"`
	Time               string `json:"time"`
	ID                 string
	ServerReceivedTime *time.Time
}

type delayResponseBody struct {
	Offset  int `json:"offset"`
	Latency int `json:"latency"`
}

func socketHandler(ticker *time.Ticker) func(ws *websocket.Conn) {
	return func(ws *websocket.Conn) {
		defer ws.Close()

		delayRequests := make(chan wsMessage)
		go func() {
			for {
				var m wsMessage
				err := websocket.JSON.Receive(ws, &m)
				if err == io.EOF {
					return
				}
				if err != nil {
					logrus.Errorf("Failed to read from ws: %v", err)
				}
				_, ok := m.Body.(delayRequestBody)
				if !ok {
					continue
				}
				delayRequests <- m
			}
		}()

		for {
			select {
			case <-ticker.C:
				{
					if err := websocket.JSON.Send(ws, makeSyncMessage()); err != nil {
						logrus.Errorf("Failed to send on websocket: %v", err)
						return
					}
				}
			case r := <-delayRequests:
				{
					rb, ok := r.Body.(delayRequestBody)
					if !ok {
						continue
					}

					var res delayResponseBody

					t1, err := time.Parse(time.RFC3339Nano, rb.ReceivedValue)
					if err != nil {
						continue
					}
					t1r, err := time.Parse(time.RFC3339Nano, rb.ReceivedTime)
					if err != nil {
						continue
					}
					t2, err := time.Parse(time.RFC3339Nano, rb.Time)
					if err != nil {
						continue
					}

					clientDiff := t2.Sub(t1r)
					serverDiff := rb.ServerReceivedTime.Sub(t1)

					res.Offset = int(((t1r.UnixNano() - t1.UnixNano() - rb.ServerReceivedTime.UnixNano() + t2.UnixNano()) / 2 / 1000000))
					res.Latency = int((serverDiff.Nanoseconds() + clientDiff.Nanoseconds()) / 2 / 1000000)

					if err := websocket.JSON.Send(ws, wsMessage{
						ID:   r.ID,
						Type: "delayResponse",
						Body: res,
					}); err != nil {
						logrus.Errorf("Failed to send on websocket: %v", err)
						return
					}
				}
			}
		}
	}
}
