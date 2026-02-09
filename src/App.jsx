import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import EmotionPage from "./pages/EmotionPage";
import SignPage from "./pages/SignPage";
import "./App.css";
import FusionPage from "./pages/FusionPage";
import VerifyPage from "./components/VerifyPage";
import NlpPage from "./pages/NlpPage";
import EmotionIntelligencePage from "./pages/EmotionIntelligencePage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="nav-dock-container">
        <nav className="glass-dock">
          <NavLink to="/" end>
            <span className="icon">🚀</span> Fusion
          </NavLink>
          <NavLink to="/sign">
            <span className="icon">✋</span> Sign
          </NavLink>
          <NavLink to="/emotion">
            <span className="icon">🎭</span> Emotion
          </NavLink>
          <NavLink to="/nlp">
            <span className="icon">🧠</span> NLP
          </NavLink>
          <NavLink to="/verify">
            <span className="icon">✅</span> Verify
          </NavLink>
        </nav>
      </div>

      <main style={{ minHeight: "100vh", paddingBottom: "120px" }}>
        <Routes>
          <Route path="/" element={<FusionPage />} />
          <Route path="/sign" element={<SignPage />} />
          <Route path="/emotion" element={<EmotionIntelligencePage />} />
          <Route path="/nlp" element={<NlpPage />} />
          <Route path="/verify" element={<VerifyPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
