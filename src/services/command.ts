import { CallCommand, CommandTypes, HangUpCommand } from "../domain/command";
import { ConfigurationMessage, SessionMessage } from "../domain/message";
import { ICallService } from "./call";

export interface ICommandService {
    Configure(config: ConfigurationMessage): void;
    Execute(cmd: SessionMessage): Promise<SessionMessage | null>;
    HandleResponse(response: SessionMessage): Promise<SessionMessage | null>;
}

export class DefaultCommandService implements ICommandService {
    callService: ICallService;

    constructor(callService: ICallService) {
        this.callService = callService;
    }

    Configure(config: ConfigurationMessage): void {
        this.callService.Configure(config);
    }

    async Execute(cmd: SessionMessage): Promise<SessionMessage | null> {
        let response: SessionMessage | null = null;

        switch(cmd.Type) {
            case CommandTypes.Call:
                response = await this.callService.InitCall(cmd as CallCommand);
                break;
            case CommandTypes.HangUp:
                await this.callService.EndCall(cmd as HangUpCommand);
                break;
            case CommandTypes.Digit:
                break;
            case CommandTypes.Disconnect:
                response = cmd;
                break;
            default:
        }

        return response;
    }

    async HandleResponse(response: SessionMessage): Promise<SessionMessage | null> {
        switch(response.Type) {
            case CommandTypes.Call:
                // If  it's adhoc ...
                let cmd = response as CallCommand
                if(!await this.callService.EstablishCall(cmd)) {
                    return cmd;
                }
                break;
            default:
        }

        return null;
    }
}