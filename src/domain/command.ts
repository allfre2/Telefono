import { SessionMessage } from "./message";

export enum CommandTypes {
    Call = 'call',
    Digit = 'digit',
    HangUp = 'hangup',
    Disconnect = 'disconnect',
}

export class DigitCommand extends SessionMessage {

}

export class CallCommand extends SessionMessage {
    Mode: string;
    AdHocId: string;
    Parameters: any
}

export class HangUpCommand extends SessionMessage {
    AdHocId: string;
}

export class DisconnectCommand extends SessionMessage {

}