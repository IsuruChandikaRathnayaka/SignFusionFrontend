import React, { useState } from "react";

export default function VerifyPage() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (files.length !== 30) {
      alert("Upload exactly 30 images");
      return;
    }

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
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>🧪 Sign Model Verification</h2>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles([...e.target.files])}
      />

      <button onClick={handleUpload} style={{ marginTop: 10 }}>
        Verify Sequence
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <h3>Prediction:</h3>
          <p>Label: {result.predicted_label}</p>
          <p>Confidence: {(result.confidence * 100).toFixed(2)}%</p>
        </div>
      )}
    </div>
  );
}
