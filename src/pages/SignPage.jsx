import React, { useCallback, useRef, useState } from "react";
import UniversalDetector from "../components/UniversalDetector";

export default function SignPage() {
  const [sign, setSign] = useState("No sign detected");
  const [confidence, setConfidence] = useState(0);
  const [sequenceFrames, setSequenceFrames] = useState([]);
  const [backendFrameCount, setBackendFrameCount] = useState(0);

  const BACKEND_URL = "http://127.0.0.1:5001/sign/predict";

  const resetSignBuffer = async () => {
    try {
      await fetch("http://127.0.0.1:5001/sign/reset", { method: "POST" });
      setSign("—");
      setConfidence(0);
      setSequenceFrames([]);
      setBackendFrameCount(0);
    } catch (e) {
      console.error("Reset error", e);
    }
  };

  const handleSignFrame = useCallback(async (dataUrl) => {
    // 👇 STORE FRAME FOR PREVIEW
    setSequenceFrames((prev) => {
      const updated = [...prev, dataUrl];
      return updated.slice(-30);
    });

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();

      if (data.status === "buffering") {
        setBackendFrameCount(data.frames_collected);
        return;
      }

      setBackendFrameCount(30);

      if (data.status === "predicted" || data.status === "low_confidence") {
        setConfidence(((data.confidence || 0) * 100).toFixed(1));
        if (data.confidence > 0.15) {
          setSign(data.label);
        } else {
          setSign("—");
        }
      }
    } catch (err) {
      console.error("Prediction error:", err);
    }
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }} className="animate-fade-in">
      <header style={{ textAlign: "center", marginBottom: 60 }}>
        <h1 className="text-gradient-primary" style={{ fontSize: "3rem", fontWeight: 800, marginBottom: 16 }}>
          Sign Recognition
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
          Dynamic gesture analysis using LSA64 optimized LSTM networks.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
        {/* Left: Detector */}
        <section className="glass-card" style={{ padding: 24, paddingBottom: 16 }}>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
            <UniversalDetector
              onSignFrame={handleSignFrame}
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

        {/* Right: Analytics */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 32 }}>Gesture Signal</h2>

            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Current Label</span>
                <span style={{ color: "var(--secondary)", fontWeight: 600 }}>{confidence}%</span>
              </div>
              <div className="prediction-value" style={{ marginBottom: 12 }}>
                {sign}
              </div>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${confidence}%`,
                    background: "var(--secondary)",
                    boxShadow: "0 0 20px var(--secondary-glow)"
                  }}
                />
              </div>
            </div>

            {/* Buffer Status Card Mini */}
            <div style={{
              padding: 20,
              background: "rgba(0,0,0,0.2)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.05)",
              textAlign: "center"
            }}>
              <div style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: "0.75rem",
                fontWeight: 600,
                marginBottom: 12,
                background: backendFrameCount >= 30 ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
                color: backendFrameCount >= 30 ? "#22c55e" : "#f59e0b",
                border: `1px solid ${backendFrameCount >= 30 ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)"}`
              }}>
                {backendFrameCount < 30 ? `⚡ Collect: ${backendFrameCount}/30` : "✅ Ready"}
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                {backendFrameCount < 30 ? "Buffering temporal frames..." : "Temporal inference active."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
