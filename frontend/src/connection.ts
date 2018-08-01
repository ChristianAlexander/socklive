import { ITimeService } from "./interfaces";
import { SyncResponseBody, DelayRequestBody, DelayResponseBody } from "./types";

export class WebsocketTimeService implements ITimeService {
  constructor(private uri: string) {}

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.uri);
      const initialErrorListener = e => {
        reject(e);
        this.socket.removeEventListener("error", initialErrorListener);
      };

      this.socket.addEventListener("open", () => {
        resolve();
      });
      this.socket.addEventListener("error", initialErrorListener);
      this.socket.addEventListener("close", this.retry(500));
    });
  }

  private retry = (interval: number) => () => {
    console.log(`Retrying websocket connection in ${interval}ms`);
    setTimeout(() => {
      const socket = new WebSocket(this.uri);
      const nextRetry = this.retry(Math.min(interval * 1.5, 5000));

      socket.addEventListener("error", nextRetry);
      socket.addEventListener("open", () => {
        socket.addEventListener("close", this.retry(500));
        this.socket = socket;
      });
    }, interval);
  };

  async getDelay(): Promise<DelayResponseBody> {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Websocket is not currently open!");
    }

    const syncData = await this.getMessage<SyncResponseBody>("sync");
    console.log(syncData);

    const requestId = String(Math.round(Math.random() * 1000000));
    const delayRequest: DelayRequestBody = {
      receivedValue: syncData.time,
      receivedTime: formatTime(syncData.receivedTime),
      time: formatTime(this.getNow())
    };
    console.log(
      "Sending",
      JSON.stringify({
        id: requestId,
        type: "delayRequest",
        body: delayRequest
      })
    );
    const delayResponsePromise = this.getMessage<DelayResponseBody>(
      "delayResponse",
      requestId
    );
    this.socket.send(
      JSON.stringify({
        id: requestId,
        type: "delayRequest",
        body: delayRequest
      })
    );

    const delayResponse = await delayResponsePromise;
    this.offset = this.offset + delayResponse.offset;
    return delayResponse;
  }

  private getMessage<T>(type: string, id?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      const listener = (event: MessageEvent) => {
        const receivedTime = this.getNow();
        const data = JSON.parse(event.data);
        if ((data.type && data.type === type && !id) || data.id === id) {
          socket.removeEventListener("message", listener);
          resolve({ ...data.body, receivedTime });
        }
      };
      function errorListener(error: Event) {
        socket.removeEventListener("error", errorListener);
        reject(error);
      }
      socket.addEventListener("message", listener);
      socket.addEventListener("error", errorListener);
    });
  }

  getNow(): Date {
    // console.log(this.offset, this.offsetsSeen);
    return new Date(
      performance.timing.navigationStart + performance.now() - this.offset
    );
    // return new Date(new Date().getTime() - this.offset);
  }

  private offset: number = 0;
  private socket: WebSocket;
}

function formatTime(time: Date): string {
  return (
    time.getUTCFullYear() +
    "-" +
    pad(time.getUTCMonth() + 1) +
    "-" +
    pad(time.getUTCDate()) +
    "T" +
    pad(time.getUTCHours()) +
    ":" +
    pad(time.getUTCMinutes()) +
    ":" +
    pad(time.getUTCSeconds()) +
    "." +
    (time.getUTCMilliseconds() / 1000).toFixed(9).slice(2) +
    "Z"
  );
}

function pad(number) {
  if (number < 10) {
    return "0" + number;
  }
  return number;
}
