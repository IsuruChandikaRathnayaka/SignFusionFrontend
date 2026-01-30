import React, { useCallback, useRef, useState, useEffect } from "react";
import Detector from "../components/Detector";
import SignDetector from "../components/Signdetector";
import UnifiedDetector from "../components/UnifiedDetector.JSX";
import UniversalDetector from "../components/UniversalDetector";
export default function FusionPage() {
  // -------- STATES --------
  const [emotion, setEmotion] = useState("—");
  const [emotionConf, setEmotionConf] = useState(0);

  const [sign, setSign] = useState("—");
  const [signConf, setSignConf] = useState(0);

  const [sentence, setSentence] = useState("Waiting for fusion...");

  // -------- MEMORY (VERY IMPORTANT) --------
  const lastValidSign = useRef("—");
  const lastValidEmotion = useRef("—");

  // -------- TIMERS --------
  const lastEmotion = useRef(0);
  const lastSign = useRef(0);
  const lastFusion = useRef(0);

  const FUSION_COOLDOWN = 3000; // 3 seconds

  // -------- BACKENDS --------
  const EMOTION_API = "http://127.0.0.1:5000/emotion/predict";
  const SIGN_API = "http://127.0.0.1:5001/sign/predict";
  const NLP_API = "http://127.0.0.1:5002/nlp/generate";

  // ================= EMOTION HANDLER =================
  const onFaceCropped = useCallback(async (dataUrl) => {
    const now = Date.now();
    if (now - lastEmotion.current < 700) return;
    lastEmotion.current = now;

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

  // ================= SIGN HANDLER =================
  const onSignFrame = useCallback(async (dataUrl) => {
    const now = Date.now();
    if (now - lastSign.current < 800) return;
    lastSign.current = now;

    try {
      const res = await fetch(SIGN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();

      console.log("SIGN API RESPONSE:", data);

      // Normalize sign name: "55_Catch" → "Catch"
      const rawSign = data.label || "";
      const cleanSign = rawSign.includes("_") ? rawSign.split("_")[1] : rawSign;

      if (data.confidence > 0.25) {
        lastValidSign.current = cleanSign;
        setSign(cleanSign);
        setSignConf(data.confidence);
      } else {
        setSign(lastValidSign.current);
      }
    } catch (e) {
      console.error("Sign error", e);
    }
  }, []);

  // ================= FUSION LOGIC =================
  useEffect(() => {
    const now = Date.now();

    if (
      emotionConf > 0.4 &&
      signConf > 0.25 &&
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

  // ================= UI =================
  return (
    <div style={{ padding: 20 }}>
      <h1>🧠 SignFusion — Emotion + Sign (Single Page)</h1>

      <div style={{ display: "flex", gap: 20 }}>
        {/* <div style={{ flex: 1 }}>
          <h3>Face Emotion</h3>
          <Detector onFaceCropped={onFaceCropped} />
          <p>
            Emotion: <b>{emotion}</b>
          </p>
          <p>Confidence: {(emotionConf * 100).toFixed(1)}%</p>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Sign Language</h3>
          <SignDetector onSignFrame={onSignFrame} />
          <p>
            Sign: <b>{sign}</b>
          </p>
          <p>Confidence: {(signConf * 100).toFixed(1)}%</p>
        </div> */}
        <UniversalDetector
          onFaceCropped={onFaceCropped}
          onSignFrame={onSignFrame}
        />
      </div>

      <hr />

      <h2>🗣️ Fused Output</h2>
      <p style={{ fontSize: 22, fontWeight: "bold" }}>{sentence}</p>
    </div>
  );
}
