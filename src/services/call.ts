import { OngoingCall } from "../domain/call";
import { CallCommand, HangUpCommand } from "../domain/command";
import { ConfigurationMessage } from "../domain/message";
import { ILogger } from "../util/logger";

export interface ICallService {
    InitCall(cmd: CallCommand): Promise<void>;
    EstablishCall(cmd: CallCommand): Promise<boolean>;
    EndCall(cmd: HangUpCommand): void;
    HasActiveCall(): boolean;
    Configure(config: ConfigurationMessage): void;
}

export type TrackHandler = (event: RTCTrackEvent) => void;

export class WebRTCService implements ICallService {
    ICEServers: string[];
    peerConnection: RTCPeerConnection;
    currentCall: OngoingCall;
    trackHandler: TrackHandler;
    logger: ILogger;

    constructor(trackHandler: TrackHandler, logger: ILogger) {
        this.trackHandler = trackHandler;
        this.logger = logger;
    }

    async InitCall(cmd: CallCommand): Promise<void> {
        this.currentCall = new OngoingCall();

        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: this.ICEServers }]
        });

        this.peerConnection.ontrack = this.trackHandler;
        this.peerConnection.oniceconnectionstatechange = this.ICEConnectionStateChangeHandler;
        this.peerConnection.onicecandidate = event => { this.ICECandidateHandler(event, cmd); }

        await this.SetupOutputTrack();
        await this.CreateOffer(cmd);
    }

    async EstablishCall(cmd: CallCommand): Promise<boolean> {
        await this.peerConnection
            .setRemoteDescription(cmd.Parameters.SessionDescription);

        if (cmd.Parameters.IsOffer) {
            await this.CreateAnswer(cmd);
            return false;
        }

        return true; // finished signaling, call established
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

    private ICECandidateHandler(event: RTCPeerConnectionIceEvent, cmd: CallCommand): void {
        if (event.candidate === null) {
            cmd.Parameters.LocalDescription = this.peerConnection.localDescription;
            cmd.Parameters.IsOffer = true;
        }
    }

    private async SetupOutputTrack(): Promise<void> {
        let stream = await navigator
            .mediaDevices
            .getUserMedia({ audio: true });

        stream.getAudioTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
            this.peerConnection.addTransceiver(track, { direction: 'sendrecv' });
        });

        this.checkAudioActivity(stream); // (!)
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

  p: any;
private checkAudioActivity(stream: MediaStream) {
  const audioContext = new (window.AudioContext/* || window.webkitAudioContext*/)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  source.connect(analyser);
  analyser.fftSize = 256;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
    let self = this;
  function update() {
    if (!self.p) {
    self.p = document.createElement('p');
    document.body.appendChild(self.p);
    }
    requestAnimationFrame(update);
    analyser.getByteFrequencyData(dataArray);

    // Calculate the average volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i]!;
    }
    const averageVolume = sum / bufferLength;

    // A volume above a certain threshold (e.g., > 0 for some noise, a higher value for speech) indicates the mic is working.
    if (averageVolume > 0) {
      self.p.innerHTML = 'volume: ' + averageVolume;
      // You can add visual feedback to the user here (e.g., a volume bar)
    } else {
      self.p.innerHTML = 'microphone is open but silent.';
    }
  }

  update();
}
}