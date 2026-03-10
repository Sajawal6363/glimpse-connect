import { useEffect, useRef, useState, useCallback } from "react";

interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled?: boolean;
  checkInterval?: number;
  brightnessThreshold?: number;
  warningDuration?: number;
}

export function useFaceDetection(options: UseFaceDetectionOptions) {
  const {
    videoRef,
    enabled = true,
    checkInterval = 3000,
    brightnessThreshold = 30,
    warningDuration = 10,
  } = options;

  const [faceDetected, setFaceDetected] = useState(true);
  const [warningTimer, setWarningTimer] = useState(warningDuration);
  const [showWarning, setShowWarning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noFaceStartRef = useRef<number | null>(null);

  const checkBrightness = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;

    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }

    const avgBrightness = totalBrightness / pixelCount;
    const detected = avgBrightness > brightnessThreshold;

    setFaceDetected(detected);

    if (!detected) {
      if (!noFaceStartRef.current) {
        noFaceStartRef.current = Date.now();
      }

      const elapsed = (Date.now() - noFaceStartRef.current) / 1000;
      if (elapsed >= warningDuration) {
        setShowWarning(true);
      } else {
        setWarningTimer(Math.max(0, warningDuration - Math.floor(elapsed)));
      }
    } else {
      noFaceStartRef.current = null;
      setShowWarning(false);
      setWarningTimer(warningDuration);
    }
  }, [videoRef, brightnessThreshold, warningDuration]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(checkBrightness, checkInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [enabled, checkInterval, checkBrightness]);

  return {
    faceDetected,
    warningTimer,
    showWarning,
  };
}
