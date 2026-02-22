import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import "./Detector.css";

export default function Detector({ onFaceCropped }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [error, setError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  const [faceCount, setFaceCount] = useState(0);

  // Load face-api models
  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        console.log("Loading face detection models...");
        setLoadingStatus("Loading face detection models...");

        const MODEL_URL = "/models";

        // Load face detection model
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

        // For better accuracy, you can also load SSD Mobilenet
        // await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

        // Face landmark detection (optional but helps)
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

        if (isMounted) {
          console.log("Models loaded successfully!");
          setModelsLoaded(true);
          setLoadingStatus("Models loaded. Starting camera...");
        }
      } catch (error) {
        console.error("Error loading models:", error);
        if (isMounted) {
          setError(`Failed to load face detection models: ${error.message}`);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize camera
  useEffect(() => {
    if (!modelsLoaded) return;

    let stream = null;
    let isMounted = true;

    const startCamera = async () => {
      try {
        setLoadingStatus("Requesting camera access...");

        // Get available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);

        // Camera constraints - higher resolution for better detection
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
            frameRate: { ideal: 30 },
          },
          audio: false,
        };

        if (selectedDevice) {
          constraints.video.deviceId = { exact: selectedDevice };
        }

        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Wait for video to be ready
          await new Promise((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error("Video ref not available"));
              return;
            }

            const onLoaded = () => {
              console.log(
                "Video loaded, dimensions:",
                videoRef.current.videoWidth,
                "x",
                videoRef.current.videoHeight
              );

              videoRef.current.removeEventListener("loadedmetadata", onLoaded);
              videoRef.current.removeEventListener("error", onError);
              resolve();
            };

            const onError = (e) => {
              console.error("Video error:", e);
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

          if (isMounted) {
            setIsCameraActive(true);
            setLoadingStatus("");
            setDetectionActive(true);
          }
        }
      } catch (error) {
        console.error("Camera error:", error);
        if (isMounted) {
          setError(
            `Camera error: ${error.message}. Please allow camera permissions.`
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(false);
    };
  }, [modelsLoaded, selectedDevice]);

  // Face detection loop - FIXED VERSION
  useEffect(() => {
    if (!detectionActive || !isCameraActive || !videoRef.current) return;

    let animationFrameId;
    let lastDetectionTime = 0;
    const DETECTION_INTERVAL = 300; // ms
    let lastFaceDataUrl = ""; // Store last face to avoid duplicate processing

    const detectFaces = async () => {
      try {
        const now = Date.now();
        if (now - lastDetectionTime < DETECTION_INTERVAL) {
          animationFrameId = requestAnimationFrame(detectFaces);
          return;
        }

        lastDetectionTime = now;

        // Clear canvas
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && videoRef.current.videoWidth > 0) {
          // Set canvas size to match video
          if (
            canvas.width !== videoRef.current.videoWidth ||
            canvas.height !== videoRef.current.videoHeight
          ) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Detect faces with options for better accuracy
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320, // Smaller = faster, larger = more accurate
            scoreThreshold: 0.5, // Lower = more detections, higher = more confident
          })
        );

        setFaceCount(detections.length);

        // Draw detections on canvas
        if (detections.length > 0 && canvas && ctx) {
          // faceapi.draw.drawDetections(canvas, detections);

          // Custom drawing for better visibility
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

            // Draw confidence score
            if (detection.score) {
              const scoreText = `Score: ${(detection.score * 100).toFixed(1)}%`;
              ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
              ctx.fillRect(box.x, box.y + box.height + 5, textWidth + 20, 20);
              ctx.fillStyle = "#FF9800";
              ctx.font = "14px Arial";
              ctx.fillText(scoreText, box.x + 10, box.y + box.height + 20);
            }
          });

          // Process the most prominent face (largest or highest score)
          const primaryFace = detections.reduce((prev, current) =>
            current.box.width * current.box.height >
            prev.box.width * prev.box.height
              ? current
              : prev
          );

          // Create cropped face image
          // Create cropped face image
          if (onFaceCropped) {
            try {
              const tempCanvas = document.createElement("canvas");
              const tempCtx = tempCanvas.getContext("2d");

              // Add padding around the face
              const padding = 20;
              const cropX = Math.max(0, primaryFace.box.x - padding);
              const cropY = Math.max(0, primaryFace.box.y - padding);
              const cropWidth = Math.min(
                videoRef.current.videoWidth - cropX,
                primaryFace.box.width + padding * 2
              );
              const cropHeight = Math.min(
                videoRef.current.videoHeight - cropY,
                primaryFace.box.height + padding * 2
              );

              if (cropWidth <= 0 || cropHeight <= 0) {
                console.warn("Invalid crop size, skipping frame");
                return;
              }

              tempCanvas.width = cropWidth;
              tempCanvas.height = cropHeight;

              // 🚫 NO mirror tricks here – just crop directly
              tempCtx.drawImage(
                videoRef.current,
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

              console.log("Face crop dataUrl length:", dataUrl.length);

              // Only send if different from last one (to avoid spamming)
              if (dataUrl !== lastFaceDataUrl) {
                lastFaceDataUrl = dataUrl;
                console.log("Sending face crop to backend...");
                onFaceCropped(dataUrl);
              }
            } catch (cropError) {
              console.error("Error cropping face:", cropError);
            }
          }
        }
      } catch (detectionError) {
        console.error("Detection error:", detectionError);
      }

      if (detectionActive && isCameraActive) {
        animationFrameId = requestAnimationFrame(detectFaces);
      }
    };

    detectFaces();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [detectionActive, isCameraActive, onFaceCropped]);

  const toggleDetection = () => {
    setDetectionActive(!detectionActive);
  };

  const handleDeviceChange = (e) => {
    setSelectedDevice(e.target.value);
    // Camera will restart automatically due to useEffect dependency
  };

  const retryCamera = () => {
    setError("");
    setIsCameraActive(false);
    setDetectionActive(false);
    // Force re-initialization
    setTimeout(() => {
      if (modelsLoaded) {
        setIsCameraActive(true);
        setDetectionActive(true);
      }
    }, 100);
  };

  return (
    <div className="detector-container">
      {error && (
        <div className="error-message">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={retryCamera} className="retry-btn">
              Retry Camera
            </button>
            <button
              onClick={() => window.location.reload()}
              className="refresh-btn"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      <div className="detector-content">
        {/* Left side: Camera and controls */}
        <div className="camera-section">
          <div className="camera-container">
            <div className="video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="video-element"
                style={{
                  transform: "scaleX(-1)", // Mirror video
                  display: isCameraActive ? "block" : "none",
                }}
              />
              <canvas
                ref={canvasRef}
                className="overlay-canvas"
                style={{
                  transform: "scaleX(-1)", // Mirror canvas to match video
                }}
              />

              {!isCameraActive && !error && (
                <div className="camera-overlay">
                  {loadingStatus && <p>{loadingStatus}</p>}
                  {!modelsLoaded && (
                    <div className="camera-prompt">
                      <div className="spinner-small"></div>
                      <p>Loading face detection models...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="controls">
            <button
              onClick={toggleDetection}
              className={`toggle-btn ${detectionActive ? "active" : "paused"}`}
              disabled={!isCameraActive || !!error}
            >
              {detectionActive ? "⏸ Pause Detection" : "▶ Start Detection"}
            </button>

            {devices.length > 1 && isCameraActive && (
              <div className="device-selector">
                <label>Camera: </label>
                <select
                  value={selectedDevice}
                  onChange={handleDeviceChange}
                  disabled={!isCameraActive}
                >
                  <option value="">Default Camera</option>
                  {devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="status-indicators">
            <div className={`status ${modelsLoaded ? "success" : "loading"}`}>
              {modelsLoaded ? "✓ Models Loaded" : "⏳ Loading Models..."}
            </div>
            <div className={`status ${isCameraActive ? "success" : "loading"}`}>
              {isCameraActive ? "✓ Camera Active" : "⏳ Camera..."}
            </div>
            <div
              className={`status ${detectionActive ? "active" : "inactive"}`}
            >
              {detectionActive
                ? `● Detecting (${faceCount} faces)`
                : "○ Paused"}
            </div>
          </div>
        </div>

        {/* Right side: Info display */}
        <div className="emotion-section">
          <div className="emotion-display">
            <h3>Face Detection Status</h3>

            {detectionActive ? (
              <div className="current-emotion">
                <div className="face-count-display">
                  <div className="face-count-number">{faceCount}</div>
                  <div className="face-count-label">
                    {faceCount === 1 ? "Face Detected" : "Faces Detected"}
                  </div>
                </div>

                <div className="emotion-details">
                  <p>
                    <strong>Detection Active</strong>
                  </p>
                  <p className="hint">
                    Face crops are automatically sent to the backend
                  </p>
                  {faceCount > 0 && (
                    <div className="face-info">
                      <p>✅ Face detected and being processed</p>
                      <p>📤 Sending to emotion analysis...</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-emotion">
                <div className="no-emotion-icon">📷</div>
                <p>Detection Paused</p>
                <p className="hint">
                  Click "Start Detection" to begin face detection
                </p>
              </div>
            )}
          </div>

          <div className="emotion-history">
            <h4>Face Detection Tips</h4>
            <div className="tips-list">
              <div className="tip-item">
                <span className="tip-icon">💡</span>
                <div className="tip-content">
                  <strong>Ensure good lighting</strong>
                  <p>Face detection works best in well-lit environments</p>
                </div>
              </div>
              <div className="tip-item">
                <span className="tip-icon">👤</span>
                <div className="tip-content">
                  <strong>Position your face</strong>
                  <p>Look directly at the camera for best results</p>
                </div>
              </div>
              <div className="tip-item">
                <span className="tip-icon">⚙️</span>
                <div className="tip-content">
                  <strong>Camera quality</strong>
                  <p>Higher resolution cameras provide better detection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
