import React, { useCallback, useRef, useState } from "react";
import UniversalDetector from "../components/UniversalDetector";

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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }} className="animate-fade-in">
      <header style={{ textAlign: "center", marginBottom: 60 }}>
        <h1 className="text-gradient-primary" style={{ fontSize: "3rem", fontWeight: 800, marginBottom: 16 }}>
          Emotion Analysis
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
          Real-time affective computing and micro-expression analysis.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
        {/* Left: Detector */}
        <section className="glass-card" style={{ padding: 24 }}>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
            <UniversalDetector onFaceCropped={handleFaceCropped} disableHands={true} />
          </div>
        </section>

        {/* Right: Analytics */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 32 }}>Sentiment Signal</h2>

            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Primary State</span>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>{confidence.toFixed(0)}%</span>
              </div>
              <div className="prediction-value" style={{ marginBottom: 12 }}>
                {emotion}
              </div>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${confidence}%`,
                    background: "var(--primary)",
                    boxShadow: "0 0 20px var(--primary-glow)"
                  }}
                />
              </div>
            </div>

            {/* History Table */}
            <div style={{
              padding: 20,
              background: "rgba(255,255,255,0.02)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <h3 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>Recent States</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {emotionHistory.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span style={{ color: "white", fontWeight: 500 }}>{item.emotion}</span>
                    <span style={{ color: "var(--text-muted)" }}>{item.confidence}% • {item.time}</span>
                  </div>
                ))}
                {emotionHistory.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", padding: "10px 0" }}>
                    No history captured yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: "16px",
              textAlign: "center",
              background: isLoading ? "rgba(139, 92, 246, 0.05)" : "transparent"
            }}
          >
            <span style={{ fontSize: "0.9rem", color: isLoading ? "var(--primary)" : "var(--text-muted)" }}>
              {isLoading ? "⚡ AI Analysis in progress..." : "🟢 Engine ready"}
            </span>
            {errorMsg && (
              <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 8 }}>
                ⚠️ {errorMsg}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
