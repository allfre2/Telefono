import { OngoingCall } from "../domain/call";
import { CallCommand, HangUpCommand } from "../domain/command";
import { Events } from "../domain/event";
import { ConfigurationMessage } from "../domain/message";
import { ILogger } from "../util/logger";
import { IEventPublisher } from "./event";

export interface ICallService {
    InitCall(cmd: CallCommand): Promise<void>;
    EstablishCall(cmd: CallCommand): Promise<boolean>;
    EndCall(cmd: HangUpCommand): void;
    HasActiveCall(): boolean;
    Configure(config: ConfigurationMessage): void;
}

export class WebRTCService implements ICallService {
    ICEServers: string[];
    peerConnection: RTCPeerConnection;
    currentCall: OngoingCall;
    logger: ILogger;
    eventService: IEventPublisher;

    constructor(logger: ILogger, eventService: IEventPublisher) {
        this.logger = logger;
        this.eventService = eventService;
    }

    async InitCall(cmd: CallCommand): Promise<void> {
        this.currentCall = new OngoingCall();
        
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: this.ICEServers }]
        });

        this.peerConnection.ontrack = event => { this.TrackHandler(event) };
        this.peerConnection.oniceconnectionstatechange = event => { this.ICEConnectionStateChangeHandler(event) };
        this.peerConnection.onicecandidate = event => { this.ICECandidateHandler(event); }
        this.peerConnection.onicecandidateerror = event => { this.ICECandidateErrorHandler(event); }

        await this.SetupOutputTrack();
        await this.CreateOffer(cmd);

        this.eventService.Publish(Events.Ringing, {});
    }

    async EstablishCall(cmd: CallCommand): Promise<boolean> {
        await this.peerConnection
            .setRemoteDescription(cmd.Parameters.SessionDescription);

        if (cmd.Parameters.IsOffer) {
            await this.CreateAnswer(cmd);
            return false;
        }

        // finished signaling, call established
        return true;
    }

    EndCall(cmd: HangUpCommand): void {

    }

    HasActiveCall(): boolean {
        return !this.currentCall;
    }

    Configure(config: ConfigurationMessage): void {
        this.ICEServers = config.Parameters.ICEServers;
    }

    private ICEConnectionStateChangeHandler(event: Event): void {
        this.logger.Info(this.peerConnection.iceConnectionState);
    }

    private ICECandidateHandler(event: RTCPeerConnectionIceEvent): void {
        this.logger.Debug("On ICE candidate callback", event.candidate);
        if (event.candidate === null) {
            this.logger.Debug("Final ICE candidate received");
        }
    }
    
    private ICECandidateErrorHandler(event: RTCPeerConnectionIceErrorEvent) {
        this.logger.Error("ICE Candidate error: ", event);
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