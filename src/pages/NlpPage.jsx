import React, { useState } from "react";
//set of signs and emotions
const SIGNS = [
    "Accept", "Amused", "Annoyed", "Appear", "Argentina", "Away", "Barbecue", "Bathe", "Birthday", "Bitter",
    "Bored", "Born", "Breakfast", "Bright", "Buy", "Call", "Candy", "Catch", "Chewing-gum", "Coin",
    "Colors", "Confused", "Content", "Copy", "Country", "Curious", "Dance", "Deaf", "Disgusted", "Drawer",
    "Eager", "Embarrassed", "Enemy", "Excited", "Find", "Food", "Frustrated", "Give", "Grateful", "Green",
    "Guilty", "Happy", "Help", "Hopeful", "Hungry", "Jealous", "Last-name", "Learn", "Light-blue", "Lonely",
    "Man", "Map", "Milk", "Mock", "Music", "Name", "Nervous", "None", "Opaque", "Patience",
    "Perfume", "Photo", "Pink", "Playful", "Proud", "Realize", "Red", "Relieved", "Rice", "Run",
    "Sad", "Ship", "Shut-down", "Shy", "Sick", "Skimmer", "Son", "Spaghetti", "Stressed", "Surprised",
    "Sweet-milk", "Thanks", "Thoughtful", "Tired", "To-land", "Trap", "Uruguay", "Water", "Where", "Women",
    "Worried", "Yellow", "Yogurt"
].sort(); // Use alphabetized view 

const EMOTIONS = [
    "happy", "sad", "neutral", "angry", "surprised", "excited", "confused", "proud",
    "nervous", "grateful", "tired", "frustrated", "curious", "bored", "afraid", "embarrassed",
    "disgusted", "hopeful", "annoyed", "content", "eager", "guilty", "jealous", "lonely",
    "playful", "relieved", "shy", "sick", "stressed", "thoughtful", "worried", "amused"
].sort();

export default function NlpPage() {
    const [selectedSign, setSelectedSign] = useState("Accept");
    const [selectedEmotion, setSelectedEmotion] = useState("neutral");
    const [result, setResult] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("http://127.0.0.1:5002/nlp/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sign: selectedSign, emotion: selectedEmotion }),
            });
            const data = await res.json();
            setResult(data.sentence);
        } catch (err) {
            console.error(err);
            setResult("Error generating sentence. Is the NLP API running?");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }} className="animate-fade-in">
            <header style={{ textAlign: "center", marginBottom: 60 }}>
                <h1 className="text-gradient-primary" style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: 16 }}>
                    NLP Intelligence Mixer
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>
                    Interact directly with the SignFusion Generative Engine.
                </p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                {/* Sign Selection */}
                <section className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: "1.2rem", marginBottom: 20, color: "var(--secondary)" }}>Select Sign</h2>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                        gap: 10,
                        maxHeight: 400,
                        overflowY: "auto",
                        paddingRight: 10
                    }} className="custom-scrollbar">
                        {SIGNS.map(s => (
                            <button
                                key={s}
                                onClick={() => setSelectedSign(s)}
                                style={{
                                    padding: "8px",
                                    borderRadius: "8px",
                                    fontSize: "0.8rem",
                                    border: "1px solid",
                                    borderColor: selectedSign === s ? "var(--secondary)" : "rgba(255,255,255,0.05)",
                                    background: selectedSign === s ? "rgba(6, 182, 212, 0.1)" : "rgba(255,255,255,0.02)",
                                    color: selectedSign === s ? "var(--secondary)" : "var(--text-muted)",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Emotion Selection */}
                <section className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: "1.2rem", marginBottom: 20, color: "var(--primary)" }}>Select Emotion</h2>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                        gap: 10,
                        maxHeight: 400,
                        overflowY: "auto",
                        paddingRight: 10
                    }} className="custom-scrollbar">
                        {EMOTIONS.map(e => (
                            <button
                                key={e}
                                onClick={() => setSelectedEmotion(e)}
                                style={{
                                    padding: "8px",
                                    borderRadius: "8px",
                                    fontSize: "0.8rem",
                                    border: "1px solid",
                                    borderColor: selectedEmotion === e ? "var(--primary)" : "rgba(255,255,255,0.05)",
                                    background: selectedEmotion === e ? "rgba(139, 92, 246, 0.1)" : "rgba(255,255,255,0.02)",
                                    color: selectedEmotion === e ? "var(--primary)" : "var(--text-muted)",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* Action Area */}
            <div style={{ marginTop: 40, textAlign: "center" }}>
                <button
                    onClick={handleGenerate}
                    className="btn-primary"
                    disabled={isLoading}
                    style={{
                        padding: "16px 40px",
                        fontSize: "1.1rem",
                        opacity: isLoading ? 0.7 : 1
                    }}
                >
                    {isLoading ? "🔮 Processing Intelligence..." : "✨ Generate Interpretation"}
                </button>
            </div>

            {/* Result Display */}
            {result && (
                <div
                    className="glass-card animate-fade-in"
                    style={{
                        marginTop: 40,
                        padding: 40,
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)",
                        border: "1px solid var(--surface-border)"
                    }}
                >
                    <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 20 }}>
                        Model Interpretation
                    </h3>
                    <p style={{
                        fontSize: "2rem",
                        fontWeight: 700,
                        lineHeight: 1.4,
                        background: "linear-gradient(135deg, #fff 0%, #aaa 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent"
                    }}>
                        "{result}"
                    </p>
                </div>
            )}
        </div>
    );
}
