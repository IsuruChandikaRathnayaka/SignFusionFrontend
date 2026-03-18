import React, { useState } from "react";

export default function VerifyPage() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async () => {
    if (files.length !== 30) {
      alert("Please select exactly 30 frames for temporal sequence verification.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("frames", files[i]);
      }

      const res = await fetch("http://127.0.0.1:5001/sign/verify_sequence", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Verification failed. Ensure the Sign API is running on port 5001.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }} className="animate-fade-in">
      <header style={{ textAlign: "center", marginBottom: 60 }}>
        <h1 className="text-gradient-primary" style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: 16 }}>
          Model Verification
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>
          Diagnostic suite for temporal sequence validation and model auditing.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32 }}>
        {/* Left: Upload Zone */}
        <section className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{
            border: "2px dashed rgba(255,255,255,0.1)",
            borderRadius: 24,
            padding: 60,
            background: "rgba(255,255,255,0.01)",
            transition: "all 0.3s",
            cursor: "pointer",
            position: "relative"
          }}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFiles([...e.target.files])}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer"
              }}
            />
            <div style={{ fontSize: "4rem", marginBottom: 20 }}>📁</div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 12, color: "white" }}>
              {files.length > 0 ? `${files.length} Frames Selected` : "Drop Sequence Frames"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Selected exactly 30 images to perform a diagnostic LSTM pass.
            </p>
            {files.length > 0 && files.length !== 30 && (
              <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 12, fontWeight: 600 }}>
                ⚠️ Requirement: 30 frames. Currently: {files.length}
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            className="btn-primary"
            disabled={isLoading || files.length !== 30}
            style={{
              marginTop: 40,
              padding: "16px 60px",
              fontSize: "1.1rem",
              opacity: (isLoading || files.length !== 30) ? 0.5 : 1
            }}
          >
            {isLoading ? "⚙️ Auditing Model..." : "🔍 Run Diagnostic"}
          </button>
        </section>

        {/* Right: Results Dashboard */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 32, textTransform: "uppercase", letterSpacing: "1px" }}>Verification Result</h2>

            {result ? (
              <div className="animate-fade-in">
                <div style={{ marginBottom: 40 }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Predicted Label</span>
                  <div style={{
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    color: "var(--secondary)",
                    textShadow: "0 0 20px var(--secondary-glow)"
                  }}>
                    {result.label_name ? `${result.label_name} (${result.predicted_label})` : result.predicted_label}
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Confidence Rating</span>
                    <span style={{ color: "white", fontWeight: 600 }}>{(result.confidence * 100).toFixed(2)}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${result.confidence * 100}%`,
                        background: "var(--secondary)",
                        boxShadow: "0 0 20px var(--secondary-glow)"
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  marginTop: 40,
                  padding: 20,
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <h4 style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>System Metadata</h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    <li style={{ marginBottom: 6 }}>• Engine: LSTM-MobileNet</li>
                    <li style={{ marginBottom: 6 }}>• Context Size: 30 Frames</li>
                    <li>• Status: Verification Complete</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <p>Upload a sequence to see model performance metrics.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
