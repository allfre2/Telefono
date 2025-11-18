import { LibName } from "../config/settings";

export const enum LogLevel {
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
            console.info(`%c${LibName}:Info`, 'color: green; font-style: italic;', ...messages);
        }
    }

    Warn(...messages: any[]): void {
        if (this.logLevels[LogLevel.Warnning]) {
            console.warn(`%c${LibName}:Warning`, 'color: yellow; font-weight: bold;', ...messages);
        }
    }

    Error(...messages: any[]): void {
        if (this.logLevels[LogLevel.Error] || this.logLevels[LogLevel.Debug]) {
            console.error(`%c${LibName}:Error`, 'color: red; font-weight: bold;', ...messages);
        }
    }

    Debug(...messages: any[]): void {
        if (this.logLevels[LogLevel.Debug]) {
            console.debug(`%c${LibName}:Debug`, 'color: blue; font-weight: bold;', ...messages);
        }
    }
}