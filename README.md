# Sock Live

A websocket application implementing a PTP/NTP-like protocol for time synchronization.

My submission for the Golang Phoenix [Most Interesting Websocket Application Competition](https://www.meetup.com/Golang-Phoenix/events/252845809/).

## Building the application

`docker build -t socklive .`

## Running

`docker run -d -p 8080:8080 socklive`
