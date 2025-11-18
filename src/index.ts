import { Modes, Protocols } from "./domain/call";
import { CallCommand, CommandTypes } from "./domain/command";
import { Events } from "./domain/event";
import { ICallService, WebRTCService } from "./services/call";
import { DefaultCommandService, ICommandService } from "./services/command";
import { DefaultEventService, IEventPublisher } from "./services/event";
import { ISessionService, WebSocketService } from "./services/session";
import { ConsoleLogger, ILogger, LogLevel } from "./util/logger";

export enum Log {
    Information = LogLevel.Information,
    Warnning = LogLevel.Warnning,
    Error = LogLevel.Error,
    Debug = LogLevel.Debug,
}

export class Config {
    element: any;
    logLevels: any;
}

export default class Telefono {
    config: Config;
    eventService: IEventPublisher;
    callService: ICallService;
    cmdService: ICommandService;
    sessionService: ISessionService;
    logger: ILogger;
    audioElement: any;
    isActive: boolean;

    constructor(url: string, config: Config) {
        this.config = config;

        if (this.config.logLevels == undefined) {
            this.config.logLevels = {
                [LogLevel.Information]: true,
                [LogLevel.Warnning]: true,
                [LogLevel.Debug]: true,
            };
        }

        this.logger = new ConsoleLogger(this.config.logLevels);
        this.eventService = new DefaultEventService(config.element);
        this.callService = new WebRTCService(this.logger, this.eventService);
        this.cmdService = new DefaultCommandService(this.callService);
        this.sessionService = new WebSocketService(url, this.cmdService, this.eventService, this.logger);

        this.SetupEventDebug();

        this.isActive = true;
    }

    async Call(id: string): Promise<void> {
        if (!this.isActive) return;

        await this.sessionService.Execute({
            Type: CommandTypes.Call,
            Protocol: Protocols.WebRTC,
            Mode: Modes.AdHoc,
            Flow: '00000000-0000-0000-0000-000000000000', // Jesus Christ ...
            Organization: '',
            AdHocId: id,
            Parameters: null
        } as CallCommand);
    }

    async Close(): Promise<void> {
        if (!this.isActive) return;

        await this.sessionService.Execute({
            Type: CommandTypes.Disconnect,
        });

        this.isActive = false;
    }

    SetupEventDebug() {
        let debug = (event: any) => this.logger.Debug('(!) Event:', event);

        this.config.element?.addEventListener(Events.Connected, debug);
        this.config.element?.addEventListener(Events.Ringing, debug);
        this.config.element?.addEventListener(Events.Open, debug);
        this.config.element?.addEventListener(Events.Stream, debug);
        this.config.element?.addEventListener(Events.Track, debug);
        this.config.element?.addEventListener(Events.Closed, debug);
        this.config.element.addEventListener(Events.Disconnected, debug);
    }
}