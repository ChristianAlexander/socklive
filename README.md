# Sock Live

A websocket application implementing a PTP/NTP-like protocol for time synchronization.

## Building the frontend

Run the following command to populate `client.js` and `system.js`:
`pushd frontend && npm install && npm run build && popd`

## Building the application

`docker build -t socklive .`

## Running

`docker run -d -p 8080:8080 socklive`
