export enum MessageTypes {
    Configuration = 'configuration',
}

export class SessionMessage {
    Type: string;
}

export class ConfigurationMessage extends SessionMessage {
    Protocol: string;
    Parameters: any;
}