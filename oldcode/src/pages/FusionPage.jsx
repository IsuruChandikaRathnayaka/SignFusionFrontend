import React, { useCallback, useRef, useState } from "react";
import UniversalDetector from "../components/UniversalDetector";

export default function FusionPage() {
  const [emotion, setEmotion] = useState("—");
  const [emotionConf, setEmotionConf] = useState(0);
  const [sign, setSign] = useState("—");
  const [signConf, setSignConf] = useState(0);
  const [sentence, setSentence] = useState("Waiting for fusion...");
  const [sequenceFrames, setSequenceFrames] = useState([]);
  const [backendFrameCount, setBackendFrameCount] = useState(0);

  const lastValidSign = useRef("—");
  const lastValidEmotion = useRef("—");
  const lastSign = useRef(0);
  const lastFusion = useRef(0);
  const FUSION_COOLDOWN = 3000;

  const EMOTION_API = "http://127.0.0.1:5000/emotion/predict";
  const SIGN_API = "http://127.0.0.1:5001/sign/predict";
  const NLP_API = "http://127.0.0.1:5002/nlp/generate";

  const resetSignBuffer = async () => {
    try {
      await fetch("http://127.0.0.1:5001/sign/reset", {
        method: "POST",
      });

      setSign("—");
      setSignConf(0);
      lastValidSign.current = "—";
      setSequenceFrames([]);
      setBackendFrameCount(0);
      console.log("🧹 Sign buffer cleared");
    } catch (e) {
      console.error("Reset error", e);
    }
  };

  // Emotion handler (unchanged)
  const onFaceCropped = useCallback(async (dataUrl) => {
    const now = Date.now();
    if (now - lastSign.current < 700) return;

    try {
      const res = await fetch(EMOTION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();

      if (data.confidence > 0.35) {
        lastValidEmotion.current = data.emotion;
        setEmotion(data.emotion);
        setEmotionConf(data.confidence);
      } else {
        setEmotion(lastValidEmotion.current);
      }
    } catch (e) {
      console.error("Emotion error", e);
    }
  }, []);

  // UPDATED: Sign handler to send sequence
  const onSignFrame = useCallback(async (dataUrl) => {
    // 👇 STORE FRAME FOR PREVIEW
    setSequenceFrames((prev) => {
      const updated = [...prev, dataUrl];
      return updated.slice(-30); // Robustly keep only last 30 frames
    });

    try {
      const res = await fetch(SIGN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();

      if (data.status === "buffering") {
        setBackendFrameCount(data.frames_collected);
        return;
      }

      setBackendFrameCount(30); // Buffer is full

      if (data.status === "predicted" || data.status === "low_confidence") {
        setSignConf(data.confidence);
        // Show the label if we have at least 15% confidence
        if (data.confidence > 0.15) {
          setSign(data.label);
          if (data.status === "predicted") lastValidSign.current = data.label;
        } else {
          setSign("—");
        }
      }
    } catch (e) {
      console.error("Sign error", e);
    }
  }, []);

  // Fusion logic (unchanged)
  React.useEffect(() => {
    const now = Date.now();
    if (
      emotionConf > 0 &&
      signConf > 0 &&
      now - lastFusion.current > FUSION_COOLDOWN
    ) {
      lastFusion.current = now;

      fetch(NLP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emotion: lastValidEmotion.current,
          sign: lastValidSign.current,
        }),
      })
        .then((r) => r.json())
        .then((d) => setSentence(d.sentence))
        .catch(() => setSentence("Fusion error"));
    }
  }, [emotionConf, signConf]);

  return (
    <div style={{ padding: 20 }}>
      <h1>🧠 SignFusion — Emotion + Sign Language</h1>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 2 }}>
          <UniversalDetector
            onFaceCropped={onFaceCropped}
            onSignFrame={onSignFrame}
            onHandLost={resetSignBuffer}
          />
        </div>

        <div
          style={{
            flex: 1,
            padding: 20,
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <h3>📊 Predictions</h3>
          <div style={{ marginBottom: 20 }}>
            <div>
              <strong>Emotion:</strong> {emotion}
            </div>
            <div>Confidence: {(emotionConf * 100).toFixed(1)}%</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div>
              <strong>Sign:</strong> {sign}
            </div>
            <div>Confidence: {(signConf * 100).toFixed(1)}%</div>
          </div>

          <p style={{ fontSize: 18, fontWeight: "bold", color: "#2196F3" }}>
            {sentence}
          </p>

          <hr />

          <div style={{ padding: "10px", background: backendFrameCount >= 30 ? "#e8f5e9" : "#fff3e0", borderRadius: "5px", marginBottom: "10px" }}>
            <strong>Status:</strong> {backendFrameCount < 30 ? "⚡ Buffering..." : "✅ System Ready (Sliding Window)"}
            <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: "5px" }}>
              Backend Buffer: {backendFrameCount} / 30 frames
            </div>
          </div>

          <h3>🎞 Sequence Preview</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: "4px",
              maxWidth: "500px",
            }}
          >
            {sequenceFrames.map((frame, i) => (
              <img
                key={i}
                src={frame}
                alt={`frame-${i}`}
                style={{ width: "100%", border: "1px solid #ccc" }}
              />
            ))}
          </div>
          <button
            onClick={resetSignBuffer}
            style={{
              marginTop: "15px",
              padding: "10px 15px",
              background: "#ff9800",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔄 Reset Sign Detection
          </button>
        </div>
      </div>
    </div>
  );
}
