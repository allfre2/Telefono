export enum LogLevel {
    Information = 1,
    Warnning = 2,
    Error = 3,
    Debug = 4,
}

export interface ILogger {
    Info(...messages: any[]): void;
    Warn(...messages: any[]): void;
    Error(...messages: any[]): void;
    Debug(...messages: any[]): void;
}

export class ConsoleLogger implements ILogger {
    logLevels: any;
    constructor(logLevels: any) {
        this.logLevels = logLevels;
    }

    Info(...messages: any[]): void {
        if (this.logLevels[LogLevel.Information]) {
            console.log(...messages);
        }
    }

    Warn(...messages: any[]): void {
        if (this.logLevels[LogLevel.Warnning]) {
            console.warn(...messages);
        }
    }

    Error(...messages: any[]): void {
        if (this.logLevels[LogLevel.Error] || this.logLevels[LogLevel.Debug]) {
            console.error(...messages);
        }
    }

    Debug(...messages: any[]): void {
        if (this.logLevels[LogLevel.Debug]) {
            console.debug(...messages);
        }
    }
}