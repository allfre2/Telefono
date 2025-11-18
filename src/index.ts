import { Modes, Protocols } from "./domain/call";
import { CallCommand, CommandTypes } from "./domain/command";
import { ICallService, TrackHandler, WebRTCService } from "./services/call";
import { DefaultCommandService, ICommandService } from "./services/command";
import { ISessionService, WebSocketService } from "./services/session";
import { ConsoleLogger, ILogger, LogLevel } from "./util/logger";

export default class Telefono {
    callService: ICallService;
    cmdService: ICommandService;
    sessionService: ISessionService;
    logger: ILogger;
    audioElement: any;

    GetTrackHandler(): TrackHandler {
        let self = this;
        return (event) => {
            self.audioElement = document.createElement(event.track.kind);
            self.audioElement.srcObject = event.streams[0];
            self.audioElement.autoplay = true;
            self.audioElement.controls = true;
            document.body.appendChild(self.audioElement);
        };
    }

    GetAudioElement(): any {
        return this.audioElement;
    }

    constructor(url: string) {
        this.logger = new ConsoleLogger({
            [LogLevel.Information]: true,
            [LogLevel.Warnning]: true,
            [LogLevel.Debug]: true,
        });
        this.callService = new WebRTCService(this.GetTrackHandler(), this.logger);
        this.cmdService = new DefaultCommandService(this.callService);
        this.sessionService = new WebSocketService(url, this.cmdService, this.logger);
    }

    async Call(id: string): Promise<void> {
        await this.sessionService.Excecute({
            Type: CommandTypes.Call,
            Protocol: Protocols.WebRTC,
            Mode: Modes.AdHoc,
            Flow: '00000000-0000-0000-0000-000000000000', // Jesus Christ ...
            Organization: '',
            AdHocId: id,
            Parameters: null
        } as CallCommand)
    }
}