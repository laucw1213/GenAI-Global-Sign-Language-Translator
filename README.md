# GenAI-powered Global Sign Language Translator

## Introduction

GenAI-powered Global Sign Language Translator breaks down communication barriers between hearing and deaf communities by converting multilingual text and speech into American Sign Language (ASL) videos. Powered by Gemini 2.0 Flash AI, the system generates sign language videos within 5 seconds, supporting text input, voice recording, and audio file upload.

**Try it now:** [ASL Translator](https://storage.googleapis.com/asl-translator-website/index.html)

## Core Features

- **Fast Translation:** Generate ASL videos within 5 seconds
- **Multiple Input Methods:** Text, voice recording (10s), and audio file upload
- **Multilingual Support:** Automatic language detection and translation
- **Learning Tools:** Adjustable playback speed (0.1x-1x) and loop functionality
- **AI-Powered:** Gemini 2.0 Flash AI for accurate sign language generation

## System Architecture

![System Architecture](architecture2.png)

The system architecture is built on Google Cloud Platform and follows a numbered workflow:

**1. Generate ASL Dataset:** 
Cloud Storage stores video datasets processed by Compute Engine running ComfyUI, creating the foundation for sign language videos.

**2. Frontend (Firebase):** 
HTML/CSS/JavaScript application hosted on Firebase App Hosting, providing the user interface for interaction.

**3. Firebase Authentication:** 
Secures user access through anonymous authentication, maintaining privacy while enabling personalized experiences.

**4. Token Exchange:** 
Cloud Functions handle the conversion between Firebase tokens and GCP tokens, ensuring secure API access.

**5. Chrome + WebAI:** 
Browser-based interface where users interact with the application through text input or audio recording.

**6. Whisper API:** 
Transcribes audio input to text, enabling voice-based interaction with the system.

**7. ASL Translation Workflow:** 
Core processing pipeline that:
- Checks sentence cache in Firestore
- Translates non-English text to English using Cloud Translation API
- Creates ASL gloss using Vertex AI (Gemini 2.0 Flash)
- Matches ASL video segments from the database
- Outputs the final ASL video
- Updates the sentence cache for future use

**8. Workflow Connection:** 
Secure connection between the frontend and backend workflow, passing authenticated requests for processing.

This architecture enables seamless translation from text or speech to sign language videos, with performance optimization through caching and cloud-based processing.

## Technical Implementation

### Core Technologies
- Frontend: React.js with Tailwind CSS
- Cloud Platform: Google Cloud Platform (GCP)
- AI Models: Gemini 2.0 Flash, Whisper API
- Storage: Firestore, Cloud Storage
- Video Processing: ComfyUI on Compute Engine

### Database Structure

**users Collection**
```json
{
    "profile": {
        "created_at": "2025-02-19T00:00:00.000Z",
        "last_active": "2025-02-19T00:00:00.000Z",
        "usage_count": 0
    }
}
```

**translations Collection**
```json
{
    "user_id": "anonymous_user_id",
    "timestamp": "2025-02-19T00:00:00.000Z",
    "input_text": "hello",
    "output_gloss": "HELLO",
    "success_status": true,
    "processing_time": 2.5
}
```

**sentence_cache Collection**
```json
{
    "gloss_text": "I WANT BUY COFFEE",
    "timestamp": "2025-02-14T04:49:17.311Z",
    "video_mappings": [
        {
            "gloss": "I",
            "video_url": "https://storage.googleapis.com/genasl-video-files/I.mp4"
        },
        {
            "gloss": "WANT",
            "video_url": "https://storage.googleapis.com/genasl-video-files/WANT.mp4"
        },
        {
            "gloss": "BUY",
            "video_url": "https://storage.googleapis.com/genasl-video-files/BUY.mp4"
        },
        {
            "gloss": "COFFEE",
            "video_url": "https://storage.googleapis.com/genasl-video-files/COFFEE.mp4"
        }
    ]
}
```

**asl_mappings Collection**
```json
{
    "category": "general",
    "created_at": "2024-11-17T07:33:17.349Z",
    "gloss": "TEST",
    "metadata": {
        "format": "video/mp4"
    },
    "video_info": {
        "content_type": "video/mp4",
        "created": "2024-11-08T13:21:05.823Z",
        "public_url": "https://storage.googleapis.com/genasl-video-files/TEST.mp4",
        "size": 286522,
        "updated": "2024-11-08T13:21:05.823Z"
    },
    "video_path": "TEST.mp4"
}
```

### AI Model Application

The Gemini 2.0 Flash AI model converts English text into ASL gloss notation through:
1. Natural language understanding and semantic analysis
2. Decomposition into basic sign units and grammar optimization
3. Context-aware refinement for natural expression

The system then maps gloss notation to video clips from the database, combining them for seamless sign language videos.

## Vision

This project is not just a technical solution but a social innovation initiative aimed at reducing communication barriers, promoting social inclusion, and enhancing understanding of deaf culture through technology.
