import { CallCommand, CommandTypes } from "../domain/command";
import { ConfigurationMessage, SessionMessage } from "../domain/message";
import { Deserialize, Serialize } from "../util/serialization";
import { ICallService } from "./call";

export interface ICommandService {
    Configure(config: ConfigurationMessage): void;
    Execute(cmd: SessionMessage): Promise<void>;
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

    async Execute(cmd: SessionMessage): Promise<void> {
        switch(cmd.Type) {
            case CommandTypes.Call:
                await this.callService.InitCall(cmd as CallCommand);
                break;
            case CommandTypes.HangUp:
                break;
            case CommandTypes.Digit:
                break;
            case CommandTypes.Disconnect:
                break;
            default:
        }
    }

    async HandleResponse(response: SessionMessage): Promise<SessionMessage | null> {
        console.log("original response as session message:", response);
        console.log("original response as call command:", response as CallCommand);
        switch(response.Type) {
            case CommandTypes.Call:
                // If  it's adhoc ...
                let cmd = response as CallCommand
                if(!await this.callService.EstablishCall(cmd)) {
                    console.log("establish call returned false", cmd);
                    return cmd;
                }
                break;
            default:
        }

        return null;
    }
}