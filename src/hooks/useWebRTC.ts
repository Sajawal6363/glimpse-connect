import { useEffect, useCallback, useRef, useState } from "react";
import { webRTCService } from "@/lib/webrtc";
import { realtimeService } from "@/lib/realtime";

interface UseWebRTCOptions {
  userId: string;
  onRemoteStream?: (stream: MediaStream) => void;
  onData?: (data: unknown) => void;
  onClose?: () => void;
  onError?: (err: Error) => void;
}

export function useWebRTC(options: UseWebRTCOptions) {
  const { userId, onRemoteStream, onData, onClose, onError } = options;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const cleanupRef = useRef<(() => void)[]>([]);

  const startLocalStream = useCallback(async (video = true, audio = true) => {
    const stream = await webRTCService.getLocalStream(video, audio);
    setLocalStream(stream);
    return stream;
  }, []);

  /**
   * Connect to a matched user. Creates a signaling room, sets up peer, and
   * listens for incoming signals.
   * @param roomId unique room id shared by both peers (e.g. sorted ids joined)
   * @param initiator whether this side should initiate the WebRTC offer
   * @param stream the local media stream to share
   */
  const connectToPeer = useCallback(
    (roomId: string, initiator: boolean, stream: MediaStream) => {
      // Join the signaling room
      realtimeService.joinSignalingRoom(roomId, userId);

      // Create the WebRTC peer
      const peer = webRTCService.createPeer(initiator, stream);

      // When our peer generates a signal, send it through the signaling room
      const unsub1 = webRTCService.onSignal((signal) => {
        realtimeService.sendSignal("", userId, signal);
      });

      // When we receive a signal from the remote peer, feed it to our peer
      const unsub2 = realtimeService.onSignal((_fromUserId, signal) => {
        webRTCService.handleSignal(
          signal as Parameters<typeof webRTCService.handleSignal>[0],
        );
      });

      const unsub3 = webRTCService.onRemoteStream((rs) => {
        setRemoteStream(rs);
        setIsConnected(true);
        onRemoteStream?.(rs);
      });

      const unsub4 = webRTCService.onDataChannel((data) => {
        onData?.(data);
      });

      const unsub5 = webRTCService.onClose(() => {
        setIsConnected(false);
        setRemoteStream(null);
        onClose?.();
      });

      const unsub6 = webRTCService.onError((err) => {
        onError?.(err);
      });

      cleanupRef.current = [unsub1, unsub2, unsub3, unsub4, unsub5, unsub6];
      return peer;
    },
    [userId, onRemoteStream, onData, onClose, onError],
  );

  const sendData = useCallback((data: unknown) => {
    webRTCService.sendData(data);
  }, []);

  const toggleAudio = useCallback((enabled: boolean) => {
    webRTCService.toggleAudio(enabled);
  }, []);

  const toggleVideo = useCallback((enabled: boolean) => {
    webRTCService.toggleVideo(enabled);
  }, []);

  const disconnect = useCallback(() => {
    webRTCService.disconnect();
    realtimeService.leaveSignalingRoom();
    cleanupRef.current.forEach((fn) => fn());
    cleanupRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current.forEach((fn) => fn());
    };
  }, []);

  return {
    localStream,
    remoteStream,
    isConnected,
    startLocalStream,
    connectToPeer,
    sendData,
    toggleAudio,
    toggleVideo,
    disconnect,
  };
}
