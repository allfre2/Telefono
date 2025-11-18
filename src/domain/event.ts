import { LibName } from "../config/settings";

export enum Events {
    Connected = `${LibName}:connected`,
    Ringing = `${LibName}:ringing`,
    Stream = `${LibName}:stream`,
    Track = `${LibName}:track`,
    Open = `${LibName}:open`,
    Closed = `${LibName}:closed`,
    Disconnected = `${LibName}:disconnected`
}
