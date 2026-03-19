import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import OnboardingTour from "./components/OnboardingTour";
import SignPage from "./pages/SignPage";
import "./App.css";
import FusionPage from "./pages/FusionPage";
import VerifyPage from "./components/VerifyPage";
import NlpPage from "./pages/NlpPage";
import EmotionIntelligencePage from "./pages/EmotionIntelligencePage";
import img1 from "./assets/rocket.png";
import img2 from "./assets/hand-paper.png";
import img3 from "./assets/grin.png";
import img4 from "./assets/brain.png";
import img5 from "./assets/shield-trust.png";
export default function App() {
  return (
    <BrowserRouter>
      <OnboardingTour />
      {/*Lower Navbar*/}
      <div className="nav-dock-container">
        <nav className="glass-dock">
          <NavLink to="/" end>
            <span className="icon"><img src={img1} alt="" height={30} width={30} /></span> Fusion
          </NavLink>
          <NavLink to="/sign">
            <span className="icon"><img src={img2} alt="" height={30} width={30} /></span> Sign
          </NavLink>
          <NavLink to="/emotion">
            <span className="icon"><img src={img3} alt="" height={30} width={30} /></span> Emotion
          </NavLink>
          <NavLink to="/nlp">
            <span className="icon"><img src={img4} alt="" height={30} width={30} /></span> NLP
          </NavLink>
          <NavLink to="/verify">
            <span className="icon"><img src={img5} alt="" height={30} width={30} /></span> Verify
          </NavLink>
        </nav>
      </div>
      {/*Routes*/}
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
