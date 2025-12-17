import React, { useCallback, useRef, useState } from "react";
import Detector from "./components/Detector";
import "./App.css"; // keep your styles if present

export default function App() {
  const lastSent = useRef(0);
  const [emotion, setEmotion] = useState("No emotion detected yet");
  const [confidence, setConfidence] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  // Backend URL — change only here if your backend runs elsewhere
  const BACKEND_URL = "http://127.0.0.1:5000/predict";

  // Handler that Detector will call with face crop dataUrl
  const handleFaceCropped = useCallback(
    async (dataUrl) => {
      // Debounce: send at most once per 700 ms
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

        if (!res.ok) {
          // try to read error body
          let errBody = "";
          try {
            const json = await res.json();
            errBody = json.error ? `: ${json.error}` : "";
          } catch (_) {}
          throw new Error(`Server returned ${res.status}${errBody}`);
        }

        const data = await res.json();
        if (data.error) {
          setErrorMsg(data.error);
          setEmotion("Error");
          setConfidence(0);
        } else {
          // expected: { label: "...", confidence: 0.123 } from your backend
          setEmotion(data.emotion || "Unknown");
          setConfidence((data.confidence || 0) * 100);

          // update history (keep last 10)
          setEmotionHistory((prev) => {
            const newEntry = {
              emotion: data.label || "Unknown",
              confidence: ((data.confidence || 0) * 100).toFixed(1),
              time: new Date().toLocaleTimeString(),
            };
            return [newEntry, ...prev].slice(0, 10);
          });
        }
      } catch (err) {
        console.error("Prediction request failed:", err);
        setErrorMsg(err.message || "Prediction failed");
        setEmotion("Error");
        setConfidence(0);
      } finally {
        setIsLoading(false);
      }
    },
    [
      /* no deps */
    ]
  );

  return (
    <div className="App" style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h1>Real-time Face Emotion Detection</h1>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 60%" }}>
          <Detector onFaceCropped={handleFaceCropped} />
        </div>

        {/* Right: Results */}
        <div style={{ width: 360 }}>
          <div style={{ marginBottom: 12 }}>
            <h3>Current</h3>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700 }}>{emotion}</div>
              <div style={{ marginTop: 6 }}>
                Confidence:{" "}
                <strong>
                  {confidence > 0 ? confidence.toFixed(1) + "%" : "0%"}
                </strong>
              </div>
              {isLoading && <div style={{ marginTop: 8 }}>Analyzing...</div>}
              {errorMsg && (
                <div style={{ marginTop: 8, color: "crimson" }}>
                  Error: {errorMsg}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h4>Recent</h4>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {emotionHistory.length === 0 && <div>No recent predictions</div>}
              {emotionHistory.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{h.emotion}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{h.time}</div>
                  </div>
                  <div style={{ alignSelf: "center", fontWeight: 600 }}>
                    {h.confidence}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4>Notes</h4>
            <ul style={{ marginTop: 0 }}>
              <li>Make sure your Flask backend is running at {BACKEND_URL}</li>
              <li>
                If React is on a different origin, enable CORS in Flask
                (`flask_cors.CORS(app)`)
              </li>
              <li>
                Keep good lighting and face the camera for better accuracy
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
