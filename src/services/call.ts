import { Modes, OngoingCall } from "../domain/call";
import { CallCommand, CommandTypes, HangUpCommand } from "../domain/command";
import { CallEvents, Events } from "../domain/event";
import { ConfigurationMessage, MessageTypes, SessionMessage } from "../domain/message";
import { ILogger } from "../util/logger";
import { IEventPublisher } from "./event";

export interface ICallService {
    InitCall(cmd: CallCommand): Promise<SessionMessage | null>;
    EstablishCall(cmd: CallCommand): Promise<boolean>;
    EndCall(cmd: HangUpCommand): Promise<void>;
    HasActiveCall(): boolean;
    GetCurrentCall(): OngoingCall;
    Configure(config: ConfigurationMessage): void;
}

export class WebRTCService implements ICallService {
    ICEServers: string[];
    peerConnection: RTCPeerConnection;
    currentCall: OngoingCall | undefined;
    logger: ILogger;
    eventService: IEventPublisher;
    ICECandidates: RTCIceCandidate[] = [];

    constructor(logger: ILogger, eventService: IEventPublisher) {
        this.logger = logger;
        this.eventService = eventService;
    }

    async InitCall(cmd: CallCommand): Promise<SessionMessage | null> {
        this.currentCall = new OngoingCall();
        this.currentCall.AdHocId = cmd.AdHocId;
        this.currentCall.SDPExchangeComplete = false;
        this.currentCall.IsEstablished = false;
        
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: this.ICEServers }]
        }); 

        this.peerConnection.ontrack = event => { this.TrackHandler(event) };
        this.peerConnection.oniceconnectionstatechange = event => { this.ICEConnectionStateChangeHandler(event) };
        this.peerConnection.onicecandidate = event => { this.ICECandidateHandler(event); }
        this.peerConnection.onicecandidateerror = event => { this.ICECandidateErrorHandler(event); }
        this.peerConnection.onicegatheringstatechange = event => { this.ICEGatheringStateChangeHandler(event); };

        await this.SetupOutputTrack();
        await this.CreateOffer(cmd);

        this.eventService.Publish(Events.Ringing, {});

        return cmd;
    }

    async EstablishCall(cmd: CallCommand): Promise<boolean> {
        if (cmd.Parameters.Candidates) {
            for (let candidate of cmd.Parameters.Candidates) {
                await this.peerConnection.addIceCandidate(candidate);
            }

            return true;
        }

        await this.peerConnection
            .setRemoteDescription(cmd.Parameters.SessionDescription);

        if (this.currentCall) {
            this.currentCall.SDPExchangeComplete = true;
        }
        
        if (cmd.Parameters.IsOffer) {
            await this.CreateAnswer(cmd);
            return false;
        }

        return true;
    }

    async EndCall(cmd: HangUpCommand): Promise<void> {
        await this.ReleaseResources();
        this.currentCall = undefined;
        this.peerConnection.close();
        this.eventService.Publish(Events.Closed, {});
    }

    HasActiveCall(): boolean {
        return !!this.currentCall;
    }

    GetCurrentCall(): OngoingCall {
        return this.currentCall!;
    }

    Configure(config: ConfigurationMessage): void {
        this.ICEServers = config.Parameters.ICEServers;
    }

    private async ReleaseResources(): Promise<void> {
        this.peerConnection.getSenders().forEach(sender => {
            sender.track?.stop();
        });

        this.peerConnection.getReceivers().forEach(receiver => {
            receiver.track?.stop();
        });
    }

    private async ICEConnectionStateChangeHandler(event: Event): Promise<void> {
        this.logger.Info(this.peerConnection.iceConnectionState);

        // "new"
        // "checking"
        // "connected" <-
        // "completed"
        // "disconnected"
        // "failed"
        // "closed"

        if (this.peerConnection.iceConnectionState == 'connected') {
            this.eventService.Publish(CallEvents.Signaling, { command: this.GetCompletionCommand() });
            this.eventService.Publish(Events.Open, {});
        }

        if (this.peerConnection.iceConnectionState == 'disconnected') {
            this.logger.Warn('Peer disconnected');
            await this.EndCall(new CallCommand());
        }
    }

    private ICECandidateHandler(event: RTCPeerConnectionIceEvent): void {
        this.logger.Debug("On ICE candidate callback", event.candidate);
        if (event.candidate === null) {
            this.logger.Debug("Final ICE candidate received");
        } else {
            this.ICECandidates.push(event.candidate);

            if (this.currentCall?.SDPExchangeComplete) {
                this.eventService.Publish(CallEvents.Signaling, { command: this.GetICECandidateCommand() });
                this.ICECandidates = [];
            }
        }
    }
    
    private GetICECandidateCommand(): CallCommand {
        let cmd = new CallCommand();
        cmd.Type = CommandTypes.Call;
        cmd.Mode = Modes.AdHoc;
        cmd.AdHocId = this.currentCall?.AdHocId || '';
        cmd.Parameters = {
            Candidates: this.ICECandidates.slice()
        };

        return cmd;
    }

    private GetCompletionCommand(): CallCommand {
        let cmd = new CallCommand();
        cmd.Type = CommandTypes.Call;
        cmd.Mode = Modes.AdHoc;
        cmd.AdHocId = this.currentCall?.AdHocId || '';
        cmd.Parameters = {
            IsComplete: true
        };

        return cmd;
    }

    private ICECandidateErrorHandler(event: RTCPeerConnectionIceErrorEvent) {
        this.logger.Warn("ICE Candidate error: ", event);
    }

    private ICEGatheringStateChangeHandler(event: Event): void {
        if (this.peerConnection.iceGatheringState == 'complete') {
            this.logger.Debug("ICE Gathering complete.");
        }
    }

    private async SetupOutputTrack(): Promise<void> {
        let stream = await navigator
            .mediaDevices
            .getUserMedia({ audio: true });

        stream.getAudioTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
        });

        this.eventService.Publish(Events.Stream, { stream });
    }

    private TrackHandler(event: RTCTrackEvent): void {
        this.eventService.Publish(Events.Track, event);
    }

    private async CreateOffer(cmd: CallCommand): Promise<void> {
        let sessionDescription = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(sessionDescription);
        cmd.Parameters = {
            IsOffer: true,
            SessionDescription: this.peerConnection.localDescription,
        };
    }

    private async CreateAnswer(cmd: CallCommand): Promise<void> {
        let answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        cmd.Parameters.SessionDescription = this.peerConnection.localDescription;
        cmd.Parameters.IsOffer = false; 
    }
}