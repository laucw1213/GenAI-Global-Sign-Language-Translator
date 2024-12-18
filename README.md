# GenAI-powered Global Sign Language Translator

A modern web application that translates text and speech into sign language videos using advanced AI technologies.

## Features

### Multiple Input Methods
- **Text Input**: Direct text entry with support for multiple languages (English, Chinese)
- **Audio Recording**: Real-time speech recording with automatic transcription
- **File Upload**: Support for audio file uploads (WAV, MP3, M4A formats, up to 10MB)

### Translation Pipeline
- **Language Detection**: Automatic detection of input language
- **Text-to-Gloss**: Conversion of text to ASL gloss notation using Google's Gemini Pro
- **Gloss-to-Video**: Mapping of gloss words to corresponding sign language videos
- **Video Playback**: Advanced video player with preloading and controls

### User Interface
- **Clean, Modern Design**: Intuitive interface with Material-UI and Tailwind CSS
- **Real-time Feedback**: Loading states and progress indicators
- **Error Handling**: User-friendly error messages and recovery options
- **Responsive Layout**: Adapts to different screen sizes

## Technology Stack

### Frontend
- React.js
- Material-UI
- Tailwind CSS
- Heroicons
- Lucide React

### Backend
- Google Cloud Functions
- Google Cloud Workflows
- Google Cloud Storage
- Firestore Database
- Google Gemini Pro AI

### APIs & Services
- Whisper API for speech-to-text
- Google Gemini Pro for text-to-gloss translation
- Custom ASL video mapping service

## Architecture

### Frontend Components
- `App.js`: Main application container
- `TextInput.js`: Text input handling
- `AudioRecorder.js`: Audio recording and processing
- `UploadFile.js`: File upload handling
- `ResultDisplay.js`: Result visualization
- `apiServices.js`: API integration layer

### Backend Services
- `text-to-gloss`: Converts text to ASL gloss notation
- `gloss-to-video`: Maps gloss words to sign language videos
- `workflow.yaml`: Orchestrates the translation process

## Setup & Installation

1. **Prerequisites**
   - Node.js and npm
   - Google Cloud account
   - Required API keys (Gemini, Whisper)

2. **Frontend Setup**
   ```bash
   cd als_translator
   npm install
   npm start
   ```

3. **Backend Setup**
   - Deploy Cloud Functions
   - Configure Firestore
   - Set up Cloud Storage buckets
   - Configure workflow

4. **Environment Variables**
   ```
   GEMINI_API_KEY=your_gemini_api_key
   HUGGING_FACE_TOKEN=your_hugging_face_token
   ```

## Usage

1. **Text Translation**
   - Enter text in the input field
   - Supports multiple languages
   - Click "Translate" to process

2. **Audio Translation**
   - Click the microphone icon to start recording
   - Speak clearly into your microphone
   - Recording stops automatically after 10 seconds

3. **File Upload**
   - Click "Upload Audio File"
   - Select a supported audio file
   - Wait for processing

4. **View Results**
   - See the original input
   - View ASL gloss conversion
   - Watch sign language videos
   - Control video playback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Cloud Platform
- OpenAI's Whisper
- Google Gemini Pro
- ASL Video Dataset Contributors
