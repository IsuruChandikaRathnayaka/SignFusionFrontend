import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import EmotionPage from "./pages/EmotionPage";
import SignPage from "./pages/SignPage";
import "./App.css";
import FusionPage from "./pages/FusionPage";
import VerifyPage from "./components/VerifyPage";

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
        <Link to="/" style={{ marginRight: 15 }}>
          Emotion
        </Link>
        <Link to="/sign">Sign Language</Link>
      </nav>

      <Routes>
        <Route path="/" element={<FusionPage />} />
        <Route path="/sign" element={<SignPage />} />
        <Route path="/verify" element={<VerifyPage />} />
      </Routes>
    </BrowserRouter>
  );
}
