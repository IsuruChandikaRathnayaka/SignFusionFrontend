# SignFusionFrontend
AI multimodal System For Fyp
🧠 SignFusionFrontend
AI-Driven Multimodal Sign Language Recognition System

SignFusionFrontend is the web-based user interface for the SignFusion research project — an intelligent, real-time multimodal Sign Language Recognition (SLR) system that bridges the communication gap between deaf and hearing communities.
It integrates dynamic gesture recognition (CNN), facial emotion detection, and context-aware NLP captioning, forming a seamless translation framework supported by GAN-based data augmentation.

🚀 Features

🎥 Real-Time Video Processing – Capture and analyze live sign language gestures.

🤖 Dynamic Gesture Recognition – CNN-based model for continuous sign recognition.

😊 Facial Emotion Detection – Affective computing layer for emotional awareness.

💬 Context-Aware NLP Captioning – Converts recognized gestures and emotions into fluent text.

🧩 GAN-Based Data Enhancement – Improves dataset diversity and robustness.

🌐 Responsive Frontend Interface – Built with Next.js / React.js for real-time interaction.

🧰 Tech Stack
Layer	Technology	Purpose
Frontend	Next.js / React.js	Real-time web interface
Backend	Flask (Python)	API for model communication
Machine Learning	PyTorch, TensorFlow	Deep learning modules (CNN, GAN, NLP)
Computer Vision	OpenCV, MediaPipe	Gesture & facial feature extraction
Data Management	Google Drive / GitHub	Dataset storage and version control
📁 Project Structure
SignFusionFrontend/
├── public/              # Static assets (icons, logos, etc.)
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Next.js pages (e.g., /, /dashboard)
│   ├── services/        # API integration with backend
│   ├── styles/          # CSS / Tailwind styles
│   └── utils/           # Helper functions and constants
├── package.json         # Project dependencies
├── README.md            # You are here!
└── .gitignore           # Ignored files

⚙️ Installation & Setup

Clone the repository:

git clone https://github.com/<your-username>/SignFusionFrontend.git
cd SignFusionFrontend


Install dependencies:

npm install


Run the development server:

npm run dev


Open in browser:

http://localhost:3000

🧩 Backend Integration

Make sure the Flask backend (SignFusion-API) is running before launching the frontend.
Update the .env.local file with your backend API URL:

NEXT_PUBLIC_API_URL=http://127.0.0.1:5000

📊 Research Context

This repository represents the frontend implementation of the academic project:

“Exploring the Integration of GANs and CNNs for Real-Time Sign Language Recognition: A Multimodal Approach.”
Developed as part of the Final Year Project at Informatics Institute of Technology (IIT),
in collaboration with the University of Westminster (UoW).

👨‍💻 Author

M.D.I.C. Rathnayaka

🎓 BEng (Hons) Software Engineering

💼 Informatics Institute of Technology (IIT) – University of Westminster

📧 isuruchandika321@gmail.com


📜 License

This project is for academic and research purposes only.
© 2025 M.D.I.C. Rathnayaka. All rights reserved.
