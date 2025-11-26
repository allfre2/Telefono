import { Config, DefaultApiVersion } from "./config/settings";
import { Modes, Protocols } from "./domain/call";
import { CallCommand, CommandTypes } from "./domain/command";
import { NilUUID } from "./domain/constants";
import { ICallService, WebRTCService } from "./services/call";
import { DefaultCommandService, ICommandService } from "./services/command";
import { DefaultEventService, IEventPublisher } from "./services/event";
import { ISessionService, WebSocketService } from "./services/session";
import { ConsoleLogger, ILogger, LogLevel } from "./util/logger";

export { Config } from './config/settings'
export { Events } from './domain/event'

export default class Telefono {
    options: Config;
    eventService: IEventPublisher;
    callService: ICallService;
    cmdService: ICommandService;
    sessionService: ISessionService;
    logger: ILogger;
    audioElement: any;
    isActive: boolean;

    constructor(options: Config) {
        this.options = options;
        this.InitTelefono();
    }

    async Call(id: string): Promise<void> {
        if (!this.isActive) return;

        await this.sessionService.Execute({
            Type: CommandTypes.Call,
            Protocol: Protocols.WebRTC,
            Mode: Modes.AdHoc,
            Flow: NilUUID,
            Organization: '',
            AdHocId: id,
            Parameters: null
        } as CallCommand);
    }

    async HangUp(): Promise<void> {
        if (!this.callService.HasActiveCall()) return;

        await this.sessionService.Execute({
            Type: CommandTypes.HangUp
        });
    }

    async Close(): Promise<void> {
        if (!this.isActive) return;

        await this.sessionService.Execute({
            Type: CommandTypes.Disconnect,
        });

        this.isActive = false;
    }

    async Destroy(): Promise<void> {
        await this.HangUp();
        await this.Close();
    }

    private InitTelefono() {
        let logLevels: any = {
            [LogLevel.Information]: true,
            [LogLevel.Warnning]: true,
            [LogLevel.Error]: true,
        };

        logLevels[LogLevel.Debug] = this.options.Debug;

        this.logger = new ConsoleLogger(logLevels);
        this.eventService = new DefaultEventService(this.options.Element, this.logger);
        this.callService = new WebRTCService(this.logger, this.eventService);
        this.cmdService = new DefaultCommandService(this.callService);
        this.sessionService = new WebSocketService(this.GetSessionUrl(), this.cmdService, this.eventService, this.logger);

        this.isActive = true;
    }

    private GetSessionUrl(): string {
        return `${this.options.EnableSSL ? 'wss' : 'ws'}://` + 
        `${this.options.Host}:${this.options.Port}` +
        `/api/v${this.options.ApiVersion || DefaultApiVersion }/session`;
    }
}