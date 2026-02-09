import React, { useCallback, useRef, useState } from "react";
import UniversalDetector from "../components/UniversalDetector";

export default function EmotionIntelligencePage() {
    const lastSent = useRef(0);
    const [emotion, setEmotion] = useState("Neutral");
    const [confidence, setConfidence] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [emotionHistory, setEmotionHistory] = useState([]);

    const EMOTION_URL = "http://127.0.0.1:5000/emotion/predict";

    const handleFaceCropped = useCallback(async (dataUrl) => {
        const now = Date.now();
        if (now - lastSent.current < 1000) return;
        lastSent.current = now;

        setIsLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch(EMOTION_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: dataUrl }),
            });

            if (!res.ok) throw new Error("Backend offline");

            const data = await res.json();
            const currentEmotion = data.emotion || "Neutral";
            const currentConfidence = data.confidence || 0;

            setEmotion(currentEmotion);
            setConfidence(currentConfidence);

            setEmotionHistory(prev => [
                { emotion: currentEmotion, confidence: currentConfidence.toFixed(0), time: new Date().toLocaleTimeString() },
                ...prev.slice(0, 4)
            ]);
        } catch (err) {
            console.error("Emotion analysis failed:", err);
            setErrorMsg("Neural engine unavailable");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }} className="animate-fade-in">
            <header style={{ textAlign: "center", marginBottom: 60 }}>
                <h1 className="text-gradient-primary" style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: 16 }}>
                    Face AI Intelligence
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>
                    Advanced affective computing for real-time micro-expression analysis.
                </p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
                {/* Left: Detector */}
                <section className="glass-card" style={{ padding: 24 }}>
                    <div style={{ borderRadius: 16, overflow: "hidden" }}>
                        <UniversalDetector onFaceCropped={handleFaceCropped} disableHands={true} />
                    </div>
                </section>

                {/* Right: Analytics */}
                <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div className="glass-card" style={{ padding: 32 }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 32 }}>Affective Signal</h2>

                        <div style={{ marginBottom: 32 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" }}>
                                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Current State</span>
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
                            <h3 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>Intelligence Logs</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {emotionHistory.map((item, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                                        <span style={{ color: "white", fontWeight: 500 }}>{item.emotion}</span>
                                        <span style={{ color: "var(--text-muted)" }}>{item.confidence}% • {item.time}</span>
                                    </div>
                                ))}
                                {emotionHistory.length === 0 && (
                                    <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", padding: "10px 0" }}>
                                        Awaiting face data...
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
                            {isLoading ? "⚡ Analyzing micro-expressions..." : "🟢 Engine Synchronized"}
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
