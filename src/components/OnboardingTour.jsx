import React, { useState, useEffect } from "react";
import "./OnboardingTour.css";
import img1 from "../assets/rocket.png";
import img2 from "../assets/hand-paper.png";
import img3 from "../assets/grin.png";
import img4 from "../assets/brain.png";
import img5 from "../assets/shield-trust.png";
import img6 from "../assets/brain-doubt.png";
//The List of steps for the onboarding tour
const steps = [
    {
        title: "Welcome to SignFusion",
        description: "Your ultimate gateway to seamless communication using AI-powered Sign Language and Emotion detection.",
        icon: img1,
    },
    {
        title: "Fusion Intelligence",
        description: "Experience the synergy of sign language and facial expressions working together to understand intent.",
        icon: img1,
    },
    {
        title: "Predictive Sign",
        description: "Translate sign language gestures in real-time with high-precision LSTM models.",
        icon: img2,
    },
    {
        title: "Emotion Tracking",
        description: "Understand the subtle nuances of communication through advanced facial emotion recognition.",
        icon: img3,
    },
    {
        title: "NLP Analysis",
        description: "Leverage Natural Language Processing to refine and contextualize the detected communication.",
        icon: img4,
    },
    {
        title: "Verify & Trust",
        description: "Our advanced verification system ensures transparency and reliability in every prediction.",
        icon: img5,
    },
];

export default function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem("hasSeenOnboarding");
        if (!hasSeenTour) {
            setIsVisible(true);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeTour();
        }
    };

    const handleSkip = () => {
        completeTour();
    };

    const completeTour = () => {
        localStorage.setItem("hasSeenOnboarding", "true");
        setIsVisible(false);
    };

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    background: "rgba(255, 255, 255, 0.8)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                    zIndex: 1000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
                title="Restart Tutorial"
            >
                <img src={img6} alt="" height={30} width={30} />
            </button>
        );
    }

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-card">
                <div className="onboarding-icon-container">
                    <img src={steps[currentStep].icon} alt="" />
                </div>
                <h2 className="onboarding-title">{steps[currentStep].title}</h2>
                <p className="onboarding-description">{steps[currentStep].description}</p>

                <div className="onboarding-footer">
                    <button className="onboarding-btn onboarding-btn-secondary" onClick={handleSkip}>
                        Skip
                    </button>
                    <button className="onboarding-btn onboarding-btn-primary" onClick={handleNext}>
                        {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                    </button>
                </div>

                <div className="onboarding-dots">
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            className={`onboarding-dot ${index === currentStep ? "onboarding-dot-active" : ""}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
