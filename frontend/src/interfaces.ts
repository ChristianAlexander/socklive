import { DelayResponseBody } from "./types";

export interface ITimeService {
  open(): Promise<void>;
  getDelay(): Promise<DelayResponseBody>;
  getNow(): Date;
}
