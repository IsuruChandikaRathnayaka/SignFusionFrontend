import React, { useCallback, useRef, useState } from "react";
import Detector from "../components/Detector";

export default function EmotionPage() {
  const lastSent = useRef(0);
  const [emotion, setEmotion] = useState("No emotion detected yet");
  const [confidence, setConfidence] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const BACKEND_URL = "http://127.0.0.1:5000/emotion/predict";

  const handleFaceCropped = useCallback(async (dataUrl) => {
    const now = Date.now();
    if (now - lastSent.current < 700) return;
    lastSent.current = now;

    if (!dataUrl) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();
      setEmotion(data.emotion || "Unknown");
      setConfidence((data.confidence || 0) * 100);

      setEmotionHistory((prev) =>
        [
          {
            emotion: data.emotion,
            confidence: ((data.confidence || 0) * 100).toFixed(1),
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 10)
      );
    } catch (err) {
      setErrorMsg("Prediction failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Real-time Face Emotion Detection</h1>

      <Detector onFaceCropped={handleFaceCropped} />

      <h3>{emotion}</h3>
      <p>Confidence: {confidence.toFixed(1)}%</p>
      {isLoading && <p>Analyzing...</p>}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
    </div>
  );
}
