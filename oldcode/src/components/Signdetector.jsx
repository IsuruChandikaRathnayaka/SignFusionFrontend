import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export default function SignDetector({ onSignFrame }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastSent = useRef(0);
  const [handDetected, setHandDetected] = useState(false);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((results) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0);

      if (!results.multiHandLandmarks?.length) {
        setHandDetected(false);
        return;
      }

      setHandDetected(true);
      const lm = results.multiHandLandmarks[0];

      // Bounding box
      let minX = 1,
        minY = 1,
        maxX = 0,
        maxY = 0;
      lm.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });

      const pad = 30;
      const x = Math.max(0, minX * video.videoWidth - pad);
      const y = Math.max(0, minY * video.videoHeight - pad);
      const w = Math.min(
        video.videoWidth - x,
        (maxX - minX) * video.videoWidth + pad * 2
      );
      const h = Math.min(
        video.videoHeight - y,
        (maxY - minY) * video.videoHeight + pad * 2
      );

      // Debug rectangle
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Throttle sending
      const now = Date.now();
      if (now - lastSent.current < 800) return;
      lastSent.current = now;

      // OFFSCREEN CANVAS
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const offCtx = off.getContext("2d");

      // Draw cropped hand
      offCtx.drawImage(video, x, y, w, h, 0, 0, w, h);

      // 🔥 CONVERT TO GRAYSCALE
      const imgData = offCtx.getImageData(0, 0, w, h);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const r = imgData.data[i];
        const g = imgData.data[i + 1];
        const b = imgData.data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        imgData.data[i] = gray;
        imgData.data[i + 1] = gray;
        imgData.data[i + 2] = gray;
      }
      offCtx.putImageData(imgData, 0, 0);

      const dataUrl = off.toDataURL("image/jpeg", 0.9);
      onSignFrame(dataUrl);
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 1280,
      height: 720,
    });

    camera.start();
    return () => camera.stop();
  }, [onSignFrame]);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: "100%", border: "2px solid #4caf50" }}
      />
      <div>
        <strong>Status:</strong>{" "}
        {handDetected ? "✋ Hand detected" : "❌ No hand"}
      </div>
    </div>
  );
}
