import React, { useCallback, useRef, useState } from "react";
import UniversalDetector from "../components/UniversalDetector";

export default function FusionPage() {
  const [emotion, setEmotion] = useState("—");
  const [emotionConf, setEmotionConf] = useState(0);
  const [sign, setSign] = useState("—");
  const [signLabelName, setSignLabelName] = useState("");
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
      setSignLabelName("");
      setSignConf(0);
      lastValidSign.current = "—";
      setSequenceFrames([]);
      setBackendFrameCount(0);
      console.log("Sign buffer cleared");
    } catch (e) {
      console.error("Reset error", e);
    }
  };

  // Emotion handler
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

  // Sign handler to send sequence
  const onSignFrame = useCallback(async (dataUrl) => {
    // STORE FRAME FOR PREVIEW
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
          setSignLabelName(data.label_name || "");
          if (data.status === "predicted") lastValidSign.current = data.label;
        } else {
          setSign("—");
          setSignLabelName("");
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
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 20px" }} className="animate-fade-in">
      <header style={{ textAlign: "center", marginBottom: 60 }}>
        <h1 style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: 16 }} className="text-gradient-primary">
          SignFusion AI
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.2rem", maxWidth: 600, margin: "0 auto" }}>
          Next-generation Sign Language Recognition fused with Real-time Emotion Intelligence.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
        {/* Left column: Video Feed */}
        <section className="glass-card" style={{ padding: 24, paddingBottom: 16 }}>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
            <UniversalDetector
              onFaceCropped={onFaceCropped}
              onSignFrame={onSignFrame}
              onHandLost={resetSignBuffer}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>
              🎞 Sequence Stream (Last 30 Frames)
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(15, 1fr)",
              gap: 4,
              padding: 8,
              background: "rgba(0,0,0,0.2)",
              borderRadius: 12
            }}>
              {sequenceFrames.slice(-30).map((frame, i) => (
                <div key={i} style={{ aspectRatio: "1/1", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <img src={frame} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
              {Array.from({ length: 30 - sequenceFrames.length }).map((_, i) => (
                <div key={`empty-${i}`} style={{ aspectRatio: "1/1", background: "rgba(255,255,255,0.02)", borderRadius: 4 }} />
              ))}
            </div>
          </div>
        </section>

        {/* Right column: Predictions */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Prediction Card */}
          <div className="glass-card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 32 }}>Intelligence Center</h2>

            {/* Emotion Card */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Current Emotion</span>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>{(emotionConf * 100).toFixed(0)}%</span>
              </div>
              <div className="prediction-value" style={{ marginBottom: 12 }}>{emotion}</div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${emotionConf * 100}%`, background: "var(--primary)", boxShadow: "0 0 20px var(--primary-glow)" }} />
              </div>
            </div>

            {/* Sign Card */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Gesture Label</span>
                <span style={{ color: "var(--secondary)", fontWeight: 600 }}>{(signConf * 100).toFixed(0)}%</span>
              </div>
              <div className="prediction-value" style={{ marginBottom: 12 }}>
                {signLabelName ? `${signLabelName} (${sign})` : sign}
              </div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${signConf * 100}%`, background: "var(--secondary)", boxShadow: "0 0 20px var(--secondary-glow)" }} />
              </div>
            </div>

            {/* Fusion Output */}
            <div style={{
              padding: 24,
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))",
              borderRadius: 20,
              border: "1px solid rgba(139, 92, 246, 0.2)",
              textAlign: "center"
            }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: 12, textTransform: "uppercase" }}>Generated Interpretation</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.4, color: "white" }}>
                "{sentence}"
              </p>
            </div>
          </div>

          {/* Buffer Status Card */}
          <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
            <div style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: 30,
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 16,
              background: backendFrameCount >= 30 ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
              color: backendFrameCount >= 30 ? "#22c55e" : "#f59e0b",
              border: `1px solid ${backendFrameCount >= 30 ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)"}`
            }}>
              {backendFrameCount < 30 ? `⚡ Processing: ${backendFrameCount}/30` : "✅ System Ready"}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {backendFrameCount < 30
                ? "Collecting frame sequences to enable sliding-window inference..."
                : "Real-time gesture analysis active with 30-frame temporal memory."}
            </p>
            {/* 
            <button
              onClick={resetSignBuffer}
              style={{
                marginTop: "15px",
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                border: "1px solid var(--surface-border)",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                transition: "var(--transition)"
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.05)"}
            >
              Clear Gesture Buffer
            </button> 
            */}
          </div>
        </aside>
      </div>
    </div>
  );
}
