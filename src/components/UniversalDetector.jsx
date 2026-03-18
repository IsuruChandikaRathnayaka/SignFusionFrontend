import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import * as faceapi from "face-api.js";

export default function UniversalDetector({ onFaceCropped, onSignFrame, onHandLost, disableHands = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State variables
  const [detectionActive, setDetectionActive] = useState(true);
  const [faceCount, setFaceCount] = useState(0);
  const [handDetected, setHandDetected] = useState(false);

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

  // Function to apply pink glove with custom thickness
  const applyPinkGloveWithThickness = (ctx, landmarks, width, height, thick) => {
    ctx.save();
    const pinkColor = "rgb(143, 20, 74)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const fingerConnections = [
      [0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12],
      [0, 13, 14, 15, 16], [0, 17, 18, 19, 20],
    ];

    fingerConnections.forEach((finger) => {
      ctx.beginPath();
      ctx.strokeStyle = pinkColor;
      ctx.lineWidth = thick;
      ctx.moveTo(landmarks[finger[0]].x * width, landmarks[finger[0]].y * height);
      for (let i = 1; i < finger.length; i++) {
        ctx.lineTo(landmarks[finger[i]].x * width, landmarks[finger[i]].y * height);
      }
      ctx.stroke();
    });

    const palmPoints = [0, 1, 5, 9, 13, 17, 0];
    ctx.beginPath();
    ctx.moveTo(landmarks[0].x * width, landmarks[0].y * height);
    palmPoints.forEach((idx) => {
      ctx.lineTo(landmarks[idx].x * width, landmarks[idx].y * height);
    });
    ctx.closePath();
    ctx.fillStyle = pinkColor;
    ctx.fill();
    ctx.restore();
  };

  // Function to apply pink glove to any canvas
  const applyPinkGlove = (ctx, landmarks, width, height) => {
    applyPinkGloveWithThickness(ctx, landmarks, width, height, width * 0.08);
  };

  // Function to resize image to 160x160 (for LSTM model)
  const resizeTo160x160 = (sourceCanvas) => {
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = 160;
    finalCanvas.height = 160;
    const ctx = finalCanvas.getContext("2d");

    // ❌ DONT FILL BLACK - keep natural background like dataset
    // ctx.fillStyle = "black";
    // ctx.fillRect(0, 0, 160, 160);

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
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });

    hands.onResults((results) => {
      if (!detectionActive) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");

      if (!results.multiHandLandmarks?.length) {
        if (handDetected) {
          setHandDetected(false);
          if (onHandLost) onHandLost();
        }
        return;
      }

      setHandDetected(true);
      const lm = results.multiHandLandmarks[0];

      if (lm && ctx) {
        // Apply pink glove to display canvas (COMMENTED OUT)
        // applyPinkGlove(ctx, lm, canvas.width, canvas.height);

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
        // ===== DATASET-MATCHED CROP =====

        // Landmarks are normalized → convert like dataset
        const xs = lm.map((p) => p.x);
        const ys = lm.map((p) => p.y);

        const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const cy = ys.reduce((a, b) => a + b, 0) / ys.length;

        // Calculate hand size in absolute pixels for accurate comparison
        const handW_px = (Math.max(...xs) - Math.min(...xs)) * canvas.width;
        const handH_px = (Math.max(...ys) - Math.min(...ys)) * canvas.height;

        // Use 1.8x for a tight hand crop (LSA64 style)
        const boxSize = Math.max(handW_px, handH_px) * 1.8;

        // centered square
        let x = cx * canvas.width - boxSize / 2;
        let y = cy * canvas.height - boxSize / 2;

        // Ensure we stay within the video frame to avoid black borders
        x = Math.max(0, Math.min(canvas.width - boxSize, x));
        y = Math.max(0, Math.min(canvas.height - boxSize, y));

        const w = Math.min(boxSize, canvas.width);
        const h = Math.min(boxSize, canvas.height);

        // Draw bounding box
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Throttle frame collection
        const now = Date.now();
        if (now - lastSent.current < 100) return; // 10 FPS
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

        // Apply pink glove to the cropped hand
        // Use a thickness proportional to the HAND itself, not the frame
        const gloveThickness = Math.max(handW_px, handH_px) * 0.15;
        const scaledLandmarks = lm.map((point) => ({
          x: (point.x * canvas.width - x) / w,
          y: (point.y * canvas.height - y) / h,
        }));

        // Refined apply pink glove call with custom thickness (COMMENTED OUT)
        // applyPinkGloveWithThickness(tempCtx, scaledLandmarks, w, h, gloveThickness);

        // Resize to 160x160
        const resizedCanvas = resizeTo160x160(tempCanvas);

        const dataUrl = resizedCanvas.toDataURL("image/jpeg", 0.9);

        // ===== FRAME STABILITY FILTER REMOVED =====
        // Always sending frame if hand is detected to capture motion
        onSignFrame && onSignFrame(dataUrl);

        // update previous center (kept for debugging if needed)
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
              if (detectionActive && handsRef.current && !disableHands) {
                // Hand detection currently active for Sign/Fusion
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
    <div style={{ position: "relative", width: "100%", maxWidth: "640px" }}>
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
          borderRadius: "16px",
          display: "block",
          border: "2px solid var(--surface-border)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
        }}
      />

      {/* Premium Status Overlay */}
      <div style={{
        position: "absolute",
        top: 20,
        left: 20,
        right: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        pointerEvents: "none"
      }}>
        <div className="glass-card" style={{
          padding: "4px 4px 4px 12px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          pointerEvents: "auto"
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: detectionActive ? "#22c55e" : "#ef4444",
            boxShadow: `0 0 10px ${detectionActive ? "#22c55e" : "#ef4444"}`
          }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {detectionActive ? "Live" : "Paused"}
          </span>
          <button
            onClick={toggleDetection}
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "white",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "var(--transition)"
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.05)"}
          >
            {detectionActive ? "Pause" : "Resume"}
          </button>
        </div>

        <div className="glass-card" style={{
          padding: "8px 16px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          pointerEvents: "auto",
          display: disableHands ? "none" : "flex" // Hide hand status in emotion mode
        }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "white" }}>
            HAND: {handDetected ? "✋" : "❌"}
          </span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "white" }}>
            FACES: {faceCount}
          </span>
        </div>
      </div>

      <div style={{
        marginTop: 16,
        padding: "12px 20px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "12px",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        border: "1px solid rgba(255,255,255,0.05)",
        textAlign: "center"
      }}>
        <strong>Sequence Engine:</strong> Collecting 30 frames (160x160) for LSTM temporal inference.
      </div>
    </div>
  );
}
