import { ConfigurationMessage, SessionMessage } from "../domain/message"
import { ILogger } from "../util/logger";
import { Deserialize, Serialize } from "../util/serialization";
import { ICommandService } from "./command";

export interface ISessionService {
    Excecute(cmd: SessionMessage): Promise<void>;
    Send(msg: SessionMessage): void;
}

export class WebSocketService implements ISessionService {
    endpoint: string;
    socket: WebSocket;
    isConfigured: boolean = false;
    configuration: ConfigurationMessage;
    cmdService: ICommandService;
    logger: ILogger;

    constructor(endpoint: string, cmdService: ICommandService, logger: ILogger) {
        this.endpoint = endpoint;
        this.cmdService = cmdService;
        this.logger = logger;
        this.InitWebSocket();
    }

    async Excecute(cmd: SessionMessage): Promise<void> {
        await this.cmdService.Execute(cmd);
        this.Send(cmd);
    }

    Send(msg: SessionMessage): void {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(Serialize(msg));
            this.logger.Debug('Sent message:', msg);
        } else {
            this.logger.Debug('WebSocket is not open. Cannot send message.');
        }
    }

    private InitWebSocket(): void {
        this.socket = new WebSocket(this.endpoint);

        this.socket.addEventListener('open', (event) => {
            this.HandleOpen(event);
        });

        this.socket.addEventListener('message', async (event) => {
            await this.HandleMessage(event);
        });

        this.socket.addEventListener('error', (event) => {
            this.HandleError(event);
        });

        this.socket.addEventListener('close', (event) => {
            this.HandleClose(event);
        });
    }

    private HandleOpen(event: Event) {
        console.log('WebSocket connection opened:', event);
    }

    private async HandleMessage(event: MessageEvent<any>) {
        this.logger.Debug("Received message: " + event.data);
        if (!this.isConfigured) {
            this.configuration = Deserialize<ConfigurationMessage>(event.data);
            this.cmdService.Configure(this.configuration);
            this.isConfigured = true;
            this.logger.Info("Received configuration:", this.configuration);
            return;
        }

        let message = await this.cmdService.HandleResponse(Deserialize<SessionMessage>(event.data));
        this.logger.Info("response:", message);
        if (!!message) {
            this.Send(message);
        }
    }

    private HandleError(event: Event) {
        this.logger.Error('WebSocket error:', event);
    }

    private HandleClose(event: CloseEvent) {
        console.log('WebSocket connection closed:', event);
        if (event.wasClean) {
            this.logger.Debug(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
        } else {
            this.logger.Error('Connection died unexpectedly');
        }
    }
}