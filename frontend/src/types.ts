export type SyncResponseBody = {
  /** The time broadcasted by the server */
  time: string;

  /** The time the message was received */
  receivedTime: Date;
};

export type DelayRequestBody = {
  /** Server time from `sync` */
  receivedValue: string;

  /** Time `sync` was received */
  receivedTime: string;

  /**	Current client time */
  time: string;
};

export type DelayResponseBody = {
  /** The offset in milliseconds from the server time (server - client) */
  offset: number;

  /** The observed latency between the client and server, in milliseconds */
  latency: number;

  /** The time the message was received */
  receivedTime: Date;
};
