import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import * as faceapi from "face-api.js";

export default function UniversalDetector({ onFaceCropped, onSignFrame }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const lastFrameTime = useRef(performance.now());
  const fps = useRef(0);
  const [displayFPS, setDisplayFPS] = useState(0);

  // Face detection states
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionActive, setDetectionActive] = useState(true);
  const [faceCount, setFaceCount] = useState(0);

  // Hand detection states
  const lastSent = useRef(0);
  const [handDetected, setHandDetected] = useState(false);

  // MediaPipe Hands instance
  const handsRef = useRef(null);

  // Load face-api models
  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        console.log("Loading face detection models...");

        const MODEL_URL = "/models";

        // Load face detection model
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

        if (isMounted) {
          console.log("Models loaded successfully!");
          setModelsLoaded(true);
        }
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize MediaPipe Hands
  const initHands = () => {
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
      if (!detectionActive) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");

      // Clear hand-related drawings but keep face drawings
      // We'll redraw everything in the detection loop

      if (!results.multiHandLandmarks?.length) {
        setHandDetected(false);
        return;
      }

      setHandDetected(true);
      const lm = results.multiHandLandmarks[0];

      // Draw hand landmarks
      if (lm && ctx) {
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;

        // Draw connections
        const connections = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4], // Thumb
          [0, 5],
          [5, 6],
          [6, 7],
          [7, 8], // Index
          [0, 9],
          [9, 10],
          [10, 11],
          [11, 12], // Middle
          [0, 13],
          [13, 14],
          [14, 15],
          [15, 16], // Ring
          [0, 17],
          [17, 18],
          [18, 19],
          [19, 20], // Pinky
        ];

        connections.forEach(([start, end]) => {
          ctx.beginPath();
          ctx.moveTo(lm[start].x * canvas.width, lm[start].y * canvas.height);
          ctx.lineTo(lm[end].x * canvas.width, lm[end].y * canvas.height);
          ctx.stroke();
        });

        // Draw landmarks
        lm.forEach((point) => {
          ctx.fillStyle = "cyan";
          ctx.beginPath();
          ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            4,
            0,
            2 * Math.PI
          );
          ctx.fill();
        });

        // Calculate bounding box
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
        const x = Math.max(0, minX * canvas.width - pad);
        const y = Math.max(0, minY * canvas.height - pad);
        const w = Math.min(
          canvas.width - x,
          (maxX - minX) * canvas.width + pad * 2
        );
        const h = Math.min(
          canvas.height - y,
          (maxY - minY) * canvas.height + pad * 2
        );

        // Draw bounding box
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Throttle sending hand frame
        const now = Date.now();
        if (now - lastSent.current < 800) return;
        lastSent.current = now;

        // Create cropped hand image (grayscale)
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const offCtx = off.getContext("2d");

        // Draw cropped hand
        offCtx.drawImage(videoRef.current, x, y, w, h, 0, 0, w, h);

        // Convert to grayscale
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
        onSignFrame && onSignFrame(dataUrl);
      }
    });

    handsRef.current = hands;
    return hands;
  };

  // Main initialization
  useEffect(() => {
    if (!modelsLoaded) return;

    let stream = null;
    let isMounted = true;
    let camera = null;
    let faceAnimationFrameId = null;
    let lastFaceDetectionTime = 0;
    const FACE_DETECTION_INTERVAL = 300; // ms

    const startCamera = async () => {
      try {
        // Camera constraints
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
            frameRate: { ideal: 30 },
          },
          audio: false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          await new Promise((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error("Video ref not available"));
              return;
            }

            const onLoaded = () => {
              videoRef.current.removeEventListener("loadedmetadata", onLoaded);
              videoRef.current.removeEventListener("error", onError);
              resolve();
            };

            const onError = (e) => {
              videoRef.current.removeEventListener("loadedmetadata", onLoaded);
              videoRef.current.removeEventListener("error", onError);
              reject(new Error(`Video error: ${e.message}`));
            };

            videoRef.current.addEventListener("loadedmetadata", onLoaded);
            videoRef.current.addEventListener("error", onError);

            setTimeout(() => {
              videoRef.current.removeEventListener("loadedmetadata", onLoaded);
              videoRef.current.removeEventListener("error", onError);
              reject(new Error("Video load timeout"));
            }, 10000);
          });

          await videoRef.current.play();

          // Initialize MediaPipe Hands
          const hands = initHands();

          // Start MediaPipe camera
          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (detectionActive && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 1280,
            height: 720,
          });

          camera.start();

          // Start face detection loop
          const detectFaces = async () => {
            if (!detectionActive || !isMounted) return;

            const now = Date.now();
            if (now - lastFaceDetectionTime < FACE_DETECTION_INTERVAL) {
              faceAnimationFrameId = requestAnimationFrame(detectFaces);
              return;
            }

            lastFaceDetectionTime = now;

            try {
              const video = videoRef.current;
              const canvas = canvasRef.current;

              if (!video || !canvas) return;

              // Clear previous drawings (face and hand will be redrawn)
              const ctx = canvas.getContext("2d");
              if (video.videoWidth > 0) {
                if (
                  canvas.width !== video.videoWidth ||
                  canvas.height !== video.videoHeight
                ) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                }

                // Clear entire canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw video frame
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              }

              // Detect faces
              const detections = await faceapi.detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 320,
                  scoreThreshold: 0.5,
                })
              );

              // ================= FPS CALCULATION =================
              const nowFPS = performance.now();
              const delta = nowFPS - lastFrameTime.current;
              lastFrameTime.current = nowFPS;

              const instantFPS = 1000 / delta;

              // Exponential Moving Average for smooth FPS
              fps.current =
                fps.current === 0
                  ? instantFPS
                  : 0.9 * fps.current + 0.1 * instantFPS;

              setDisplayFPS(fps.current.toFixed(1));
              // ================================================================

              setFaceCount(detections.length);

              // Draw face detections
              if (detections.length > 0) {
                detections.forEach((detection, i) => {
                  const box = detection.box;

                  // Draw face box
                  ctx.strokeStyle = "#4CAF50";
                  ctx.lineWidth = 3;
                  ctx.strokeRect(box.x, box.y, box.width, box.height);

                  // Draw face label
                  ctx.font = "bold 16px Arial";
                  ctx.fillStyle = "#4CAF50";
                  ctx.strokeStyle = "#000000";
                  ctx.lineWidth = 2;

                  const text = `Face ${i + 1}`;
                  const textWidth = ctx.measureText(text).width;

                  // Draw text background
                  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                  ctx.fillRect(box.x, box.y - 30, textWidth + 20, 25);

                  // Draw text
                  ctx.fillStyle = "#4CAF50";
                  ctx.fillText(text, box.x + 10, box.y - 10);
                });

                // Process the most prominent face
                const primaryFace = detections.reduce((prev, current) =>
                  current.box.width * current.box.height >
                  prev.box.width * prev.box.height
                    ? current
                    : prev
                );

                // Send cropped face
                if (onFaceCropped) {
                  const padding = 20;
                  const cropX = Math.max(0, primaryFace.box.x - padding);
                  const cropY = Math.max(0, primaryFace.box.y - padding);
                  const cropWidth = Math.min(
                    video.videoWidth - cropX,
                    primaryFace.box.width + padding * 2
                  );
                  const cropHeight = Math.min(
                    video.videoHeight - cropY,
                    primaryFace.box.height + padding * 2
                  );

                  if (cropWidth > 0 && cropHeight > 0) {
                    const tempCanvas = document.createElement("canvas");
                    const tempCtx = tempCanvas.getContext("2d");
                    tempCanvas.width = cropWidth;
                    tempCanvas.height = cropHeight;

                    tempCtx.drawImage(
                      video,
                      cropX,
                      cropY,
                      cropWidth,
                      cropHeight,
                      0,
                      0,
                      cropWidth,
                      cropHeight
                    );

                    const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.9);
                    onFaceCropped(dataUrl);
                  }
                }
              }

              // Hand detection will be drawn by MediaPipe's onResults callback
              // which runs asynchronously but draws on the same canvas
            } catch (error) {
              console.error("Face detection error:", error);
            }

            if (detectionActive && isMounted) {
              faceAnimationFrameId = requestAnimationFrame(detectFaces);
            }
          };

          detectFaces();
        }
      } catch (error) {
        console.error("Camera error:", error);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (faceAnimationFrameId) {
        cancelAnimationFrame(faceAnimationFrameId);
      }
      if (camera) {
        camera.stop();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [modelsLoaded, detectionActive, onFaceCropped]);

  const toggleDetection = () => {
    setDetectionActive(!detectionActive);
  };

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
        <button onClick={toggleDetection}>
          {detectionActive ? "⏸ Pause Detection" : "▶ Start Detection"}
        </button>
        <div>
          <strong>Face Detection:</strong> {faceCount} face(s) detected
        </div>
        <div>
          <strong>Hand Detection:</strong>{" "}
          {handDetected ? "✋ Hand detected" : "❌ No hand"}
        </div>
        <div>
          <strong>Status:</strong> {detectionActive ? "● Active" : "○ Paused"}
        </div>
        <div style={{ marginTop: 10 }}>
          <strong>FPS:</strong> {displayFPS}
        </div>
      </div>
    </div>
  );
}
