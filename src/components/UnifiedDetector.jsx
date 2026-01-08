import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export default function UnifiedDetector({ onFaceCropped, onSignFrame }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const lastFaceSent = useRef(0);
  const lastHandSent = useRef(0);

  /* ===================== LOAD FACE MODELS ===================== */
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  /* ===================== INIT CAMERA ===================== */
  useEffect(() => {
    if (!modelsLoaded) return;

    let stream;
    const startCamera = async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraActive(true);
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [modelsLoaded]);

  /* ===================== HANDS SETUP ===================== */
  useEffect(() => {
    if (!isCameraActive) return;

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
      const ctx = canvasRef.current.getContext("2d");

      if (!results.multiHandLandmarks?.length) return;

      const lm = results.multiHandLandmarks[0];

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
      const x = Math.max(0, minX * videoRef.current.videoWidth - pad);
      const y = Math.max(0, minY * videoRef.current.videoHeight - pad);
      const w = (maxX - minX) * videoRef.current.videoWidth + pad * 2;
      const h = (maxY - minY) * videoRef.current.videoHeight + pad * 2;

      // 🟢 HAND BOX
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      const now = Date.now();
      if (now - lastHandSent.current < 800) return;
      lastHandSent.current = now;

      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const offCtx = off.getContext("2d");
      offCtx.drawImage(videoRef.current, x, y, w, h, 0, 0, w, h);

      const dataUrl = off.toDataURL("image/jpeg", 0.9);
      onSignFrame?.(dataUrl);
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
  }, [isCameraActive, onSignFrame]);

  /* ===================== FACE LOOP ===================== */
  useEffect(() => {
    if (!isCameraActive) return;

    let rafId;

    const detectFaces = async () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        })
      );

      detections.forEach((det, i) => {
        const { x, y, width, height } = det.box;

        // 🟩 FACE BOX
        ctx.strokeStyle = "#4CAF50";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = "#4CAF50";
        ctx.fillText(`Face ${i + 1}`, x + 5, y - 10);
      });

      if (detections.length && onFaceCropped) {
        const face = detections[0];
        const now = Date.now();
        if (now - lastFaceSent.current > 700) {
          lastFaceSent.current = now;

          const pad = 20;
          const fx = Math.max(0, face.box.x - pad);
          const fy = Math.max(0, face.box.y - pad);
          const fw = face.box.width + pad * 2;
          const fh = face.box.height + pad * 2;

          const temp = document.createElement("canvas");
          temp.width = fw;
          temp.height = fh;
          temp
            .getContext("2d")
            .drawImage(videoRef.current, fx, fy, fw, fh, 0, 0, fw, fh);

          onFaceCropped(temp.toDataURL("image/jpeg", 0.9));
        }
      }

      rafId = requestAnimationFrame(detectFaces);
    };

    detectFaces();
    return () => cancelAnimationFrame(rafId);
  }, [isCameraActive, onFaceCropped]);

  return (
    <div style={{ position: "relative" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", transform: "scaleX(-1)" }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transform: "scaleX(-1)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
