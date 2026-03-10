import SimplePeer from "simple-peer";

const STUN_URL =
  import.meta.env.VITE_STUN_URL || "stun:stun.l.google.com:19302";
const TURN_URL = import.meta.env.VITE_TURN_URL || "";
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || "";
const TURN_PASSWORD = import.meta.env.VITE_TURN_PASSWORD || "";

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: STUN_URL }];
  if (TURN_URL) {
    servers.push({
      urls: TURN_URL,
      username: TURN_USERNAME,
      credential: TURN_PASSWORD,
    });
  }
  return servers;
}

class WebRTCService {
  private peer: SimplePeer.Instance | null = null;
  private localStream: MediaStream | null = null;
  private onRemoteStreamCallbacks: ((stream: MediaStream) => void)[] = [];
  private onDataCallbacks: ((data: unknown) => void)[] = [];
  private onSignalCallbacks: ((signal: SimplePeer.SignalData) => void)[] = [];
  private onCloseCallbacks: (() => void)[] = [];
  private onErrorCallbacks: ((err: Error) => void)[] = [];

  async getLocalStream(video = true, audio = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video
          ? {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
        audio: audio
          ? { echoCancellation: true, noiseSuppression: true }
          : false,
      });
      return this.localStream;
    } catch (error) {
      throw new Error(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera/microphone access denied. Please allow access in your browser settings."
          : "Failed to access camera/microphone. Please check your device.",
      );
    }
  }

  createPeer(initiator: boolean, stream: MediaStream): SimplePeer.Instance {
    this.peer = new SimplePeer({
      initiator,
      stream,
      trickle: true,
      config: { iceServers: getIceServers() },
    });

    this.peer.on("signal", (signal) => {
      this.onSignalCallbacks.forEach((cb) => cb(signal));
    });

    this.peer.on("stream", (remoteStream) => {
      this.onRemoteStreamCallbacks.forEach((cb) => cb(remoteStream));
    });

    this.peer.on("data", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        this.onDataCallbacks.forEach((cb) => cb(parsed));
      } catch {
        this.onDataCallbacks.forEach((cb) => cb(data.toString()));
      }
    });

    this.peer.on("close", () => {
      this.onCloseCallbacks.forEach((cb) => cb());
    });

    this.peer.on("error", (err) => {
      this.onErrorCallbacks.forEach((cb) => cb(err));
    });

    return this.peer;
  }

  handleSignal(signal: SimplePeer.SignalData) {
    if (this.peer && !this.peer.destroyed) {
      this.peer.signal(signal);
    }
  }

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallbacks.push(callback);
    return () => {
      this.onRemoteStreamCallbacks = this.onRemoteStreamCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onSignal(callback: (signal: SimplePeer.SignalData) => void) {
    this.onSignalCallbacks.push(callback);
    return () => {
      this.onSignalCallbacks = this.onSignalCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onDataChannel(callback: (data: unknown) => void) {
    this.onDataCallbacks.push(callback);
    return () => {
      this.onDataCallbacks = this.onDataCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onClose(callback: () => void) {
    this.onCloseCallbacks.push(callback);
    return () => {
      this.onCloseCallbacks = this.onCloseCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onError(callback: (err: Error) => void) {
    this.onErrorCallbacks.push(callback);
    return () => {
      this.onErrorCallbacks = this.onErrorCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  sendData(data: unknown) {
    if (this.peer && !this.peer.destroyed) {
      this.peer.send(JSON.stringify(data));
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  async getConnectionStats(): Promise<RTCStatsReport | null> {
    if (!this.peer) return null;
    // @ts-expect-error SimplePeer internals
    const pc = this.peer._pc as RTCPeerConnection;
    if (pc) {
      return await pc.getStats();
    }
    return null;
  }

  getLocalStreamRef(): MediaStream | null {
    return this.localStream;
  }

  disconnect() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.onRemoteStreamCallbacks = [];
    this.onDataCallbacks = [];
    this.onSignalCallbacks = [];
    this.onCloseCallbacks = [];
    this.onErrorCallbacks = [];
  }
}

export const webRTCService = new WebRTCService();
