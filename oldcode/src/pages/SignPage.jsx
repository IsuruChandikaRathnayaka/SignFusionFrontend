import React, { useCallback, useRef, useState } from "react";
import SignDetector from "../components/Signdetector";

export default function SignPage() {
  const lastSent = useRef(0);
  const [sign, setSign] = useState("No sign detected");
  const [confidence, setConfidence] = useState(0);

  const BACKEND_URL = "http://127.0.0.1:5001/sign/predict";

  const handleSignFrame = useCallback(async (dataUrl) => {
    const now = Date.now();
    if (now - lastSent.current < 800) return;
    lastSent.current = now;

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();
      setSign(data.sign || "Unknown");
      setConfidence(((data.confidence || 0) * 100).toFixed(1));
    } catch (err) {
      console.error("Prediction error:", err);
    }
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Sign Language Recognition</h1>

      <SignDetector onSignFrame={handleSignFrame} />

      <h2>{sign}</h2>
      <p>Confidence: {confidence}%</p>
    </div>
  );
}
