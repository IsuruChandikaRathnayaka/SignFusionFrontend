import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import * as faceapi from "face-api.js";

export default function UniversalDetector({ onFaceCropped, onSignFrame }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State variables
  const [detectionActive, setDetectionActive] = useState(true);
  const [faceCount, setFaceCount] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [sequenceFrames, setSequenceFrames] = useState([]);

  // Refs
  const handsRef = useRef(null);
  const lastSent = useRef(0);
  const prevCenterRef = useRef({ x: 0, y: 0 });

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log("Face detection models loaded");
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };
    loadModels();
  }, []);

  // Function to apply pink glove to any canvas
  const applyPinkGlove = (ctx, landmarks, width, height) => {
    ctx.save();

    // Dark pink color for glove
    const pinkColor = "rgba(255, 105, 180, 0.9)"; // Hot pink
    const pinkOutline = "rgba(219, 112, 147, 1)"; // Darker pink outline

    // Draw fingers
    const fingerConnections = [
      [0, 1, 2, 3, 4], // Thumb
      [0, 5, 6, 7, 8], // Index
      [0, 9, 10, 11, 12], // Middle
      [0, 13, 14, 15, 16], // Ring
      [0, 17, 18, 19, 20], // Pinky
    ];

    // Draw each finger as filled shape
    fingerConnections.forEach((finger) => {
      if (finger.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(
          landmarks[finger[0]].x * width,
          landmarks[finger[0]].y * height,
        );

        for (let i = 1; i < finger.length; i++) {
          ctx.lineTo(
            landmarks[finger[i]].x * width,
            landmarks[finger[i]].y * height,
          );
        }

        // Make shape thicker
        for (let i = finger.length - 2; i >= 0; i--) {
          const offsetX = 6;
          const offsetY = 6;
          ctx.lineTo(
            landmarks[finger[i]].x * width + offsetX,
            landmarks[finger[i]].y * height + offsetY,
          );
        }

        ctx.closePath();
        ctx.fillStyle = pinkColor;
        ctx.strokeStyle = pinkOutline;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    });

    // Draw palm
    const palmPoints = [0, 5, 9, 13, 17];
    ctx.beginPath();
    palmPoints.forEach((pointIdx, index) => {
      const point = landmarks[pointIdx];
      if (index === 0) {
        ctx.moveTo(point.x * width, point.y * height);
      } else {
        ctx.lineTo(point.x * width, point.y * height);
      }
    });
    ctx.closePath();
    ctx.fillStyle = pinkColor;
    ctx.strokeStyle = pinkOutline;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Function to resize image to 160x160 (for LSTM model)
  const resizeTo160x160 = (sourceCanvas) => {
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = 160;
    finalCanvas.height = 160;
    const ctx = finalCanvas.getContext("2d");

    // Fill black like dataset
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 160, 160);

    // Draw centered
    ctx.drawImage(sourceCanvas, 0, 0, 160, 160);

    return finalCanvas;
  };

  // Function to convert to grayscale
  const convertToGrayscale = (canvas) => {
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, 160, 160);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = gray; // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // Alpha channel stays the same
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  };

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

      if (!results.multiHandLandmarks?.length) {
        setHandDetected(false);
        return;
      }

      setHandDetected(true);
      const lm = results.multiHandLandmarks[0];

      if (lm && ctx) {
        // Apply pink glove to display canvas
        applyPinkGlove(ctx, lm, canvas.width, canvas.height);

        // Draw hand landmarks (optional)
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

        // 🔥 BETTER HAND CROP (CENTERED + SQUARE)
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

        // get center of hand
        let cx = 0,
          cy = 0;
        lm.forEach((p) => {
          cx += p.x;
          cy += p.y;
        });
        cx /= lm.length;
        cy /= lm.length;

        // square size based on hand size
        const boxSize = Math.max(maxX - minX, maxY - minY) * canvas.width * 2.0;

        // centered square
        const x = Math.max(0, cx * canvas.width - boxSize / 2);
        const y = Math.max(0, cy * canvas.height - boxSize / 2);
        const w = Math.min(canvas.width - x, boxSize);
        const h = Math.min(canvas.height - y, boxSize);

        // Draw bounding box
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Throttle frame collection
        const now = Date.now();
        if (now - lastSent.current < 250) return; // 3-4 FPS
        lastSent.current = now;

        // Create temporary canvas for cropping
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = w;
        tempCanvas.height = h;
        tempCtx.drawImage(
          videoRef.current,
          x,
          y,
          w,
          h,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height,
        );

        // Apply pink glove to the cropped hand too
        const scaledLandmarks = lm.map((point) => ({
          x: (point.x * canvas.width - x) / w,
          y: (point.y * canvas.height - y) / h,
        }));
        applyPinkGlove(tempCtx, scaledLandmarks, w, h);

        // Resize to 160x160
        const resizedCanvas = resizeTo160x160(tempCanvas);

        const dataUrl = resizedCanvas.toDataURL("image/jpeg", 0.9);

        // ===== FRAME STABILITY FILTER =====
        const prevX = prevCenterRef.current.x;
        const prevY = prevCenterRef.current.y;

        // only send frame if hand is stable (not jumping)
        if (Math.abs(prevX - cx) < 0.015 && Math.abs(prevY - cy) < 0.015) {
          onSignFrame && onSignFrame(dataUrl);
        }

        // update previous center
        prevCenterRef.current = { x: cx, y: cy };
      }
    });

    handsRef.current = hands;
    return hands;
  };

  // Main initialization
  useEffect(() => {
    let stream = null;
    let isMounted = true;
    let camera = null;
    let faceAnimationFrameId = null;
    let lastFaceDetectionTime = 0;
    const FACE_DETECTION_INTERVAL = 300;

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
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
            setTimeout(() => reject(new Error("Video load timeout")), 10000);
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
            width: 640,
            height: 480,
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

              const ctx = canvas.getContext("2d");
              if (video.videoWidth > 0) {
                if (
                  canvas.width !== video.videoWidth ||
                  canvas.height !== video.videoHeight
                ) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                }

                // Clear canvas and draw video
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              }

              // Detect faces
              const detections = await faceapi.detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 320,
                  scoreThreshold: 0.5,
                }),
              );

              setFaceCount(detections.length);

              // DRAW FACE DETECTIONS
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
              }

              // Send face for emotion detection
              if (detections.length > 0 && onFaceCropped) {
                const primaryFace = detections.reduce((prev, current) =>
                  current.box.width * current.box.height >
                  prev.box.width * prev.box.height
                    ? current
                    : prev,
                );

                const padding = 20;
                const cropX = Math.max(0, primaryFace.box.x - padding);
                const cropY = Math.max(0, primaryFace.box.y - padding);
                const cropWidth = Math.min(
                  video.videoWidth - cropX,
                  primaryFace.box.width + padding * 2,
                );
                const cropHeight = Math.min(
                  video.videoHeight - cropY,
                  primaryFace.box.height + padding * 2,
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
                    cropHeight,
                  );

                  const finalCanvas = document.createElement("canvas");
                  const finalCtx = finalCanvas.getContext("2d");
                  finalCanvas.width = 224;
                  finalCanvas.height = 224;
                  finalCtx.drawImage(tempCanvas, 0, 0, 224, 224);

                  const dataUrl = finalCanvas.toDataURL("image/jpeg", 0.9);
                  onFaceCropped(dataUrl);
                }
              }
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
  }, [detectionActive, onFaceCropped]);

  const toggleDetection = () => {
    setDetectionActive(!detectionActive);
    if (!detectionActive) {
      // Clear buffer when starting fresh
    }
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
        style={{
          width: "100%",
          maxWidth: "640px",
          border: "2px solid #4caf50",
        }}
      />
      <div
        style={{ marginTop: "10px", padding: "10px", background: "#f5f5f5" }}
      >
        <button
          onClick={toggleDetection}
          style={{
            padding: "10px 20px",
            background: detectionActive ? "#f44336" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "10px",
          }}
        >
          {detectionActive ? "⏸ Pause Detection" : "▶ Start Detection"}
        </button>
        <div style={{ marginBottom: "5px" }}>
          <strong>Face Detection:</strong> {faceCount} face(s) detected
        </div>
        <div style={{ marginBottom: "5px" }}>
          <strong>Hand Detection:</strong>{" "}
          {handDetected ? "✋ Hand detected" : "❌ No hand"}
        </div>

        <div style={{ marginBottom: "5px" }}>
          <strong>Status:</strong> {detectionActive ? "● Active" : "○ Paused"}
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
          <strong>Note:</strong> Collecting 30 frames (160x160 grayscale) for
          LSTM prediction
        </div>
      </div>
    </div>
  );
}
