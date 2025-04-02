# Breaking Barriers: GenAI-powered Global Sign Language Translator on Google Cloud Platform

*by John Doe on March 26, 2025*

**Tags**: `Generative AI`, `Accessibility`, `Machine Learning`, `Cloud Architecture`, `Google Cloud Platform`, `Gemini AI`

---

## Introduction

In today's digital age, effective communication is essential for fostering inclusivity and breaking down barriers. However, for individuals who rely on visual communication methods like American Sign Language (ASL), traditional communication tools often fall short. This is where the GenAI-powered Global Sign Language Translator comes in.

Our innovative solution leverages the power of Gemini 2.0 Flash AI to convert multilingual text and speech into expressive American Sign Language videos within seconds. By bridging the gap between spoken and written language and sign language, we're not just creating a technological solution—we're fostering a more inclusive world where communication barriers no longer create gaps between people.

Sign language is not merely a communication tool but an essential part of deaf culture and identity. Through modern technology, we aim to provide a convenient tool for the general public to communicate easily with the deaf community, promoting social inclusion and enhancing understanding of deaf culture.

## Solution Overview

The GenAI-powered Global Sign Language Translator is a modern web application that accepts multiple types of input—multilingual text, voice recording, and audio file upload—and returns an AI-generated American Sign Language video within 5 seconds. The system supports various features designed to enhance the learning experience, including adjustable playback speeds (0.1x-1x) and loop playback functionality.

At its core, our solution is built around a robust processing pipeline that leverages state-of-the-art AI models and cloud services:

1. **Input Processing**: The system accepts text input directly or converts audio to text using the Whisper API.

2. **AI-Powered Translation**: Gemini 2.0 Flash AI converts the text into ASL gloss notation, which represents the grammatical structure of sign language.

3. **Video Generation**: The system maps the gloss notation to pre-generated video clips and assembles them into a seamless ASL video.

4. **Performance Optimization**: A sophisticated caching mechanism ensures fast response times for repeated translations.

All of this is orchestrated through Google Cloud Platform services, providing a scalable, reliable, and secure solution that can be accessed from any device with a web browser.

## Architecture Details

![System Architecture](architecture2.png)

Our system architecture is built on Google Cloud Platform and follows a numbered workflow as illustrated in the diagram:

**1. Generate ASL Dataset:**
Cloud Storage stores video datasets processed by Compute Engine running ComfyUI, creating the foundation for sign language videos. This batch process currently includes around 2,200 videos using advanced pose estimation techniques, ensuring a comprehensive library of sign language expressions.

**2. Frontend (Firebase):**
HTML/CSS/JavaScript application hosted on Firebase App Hosting, providing the user interface for interaction. Built with React.js and Tailwind CSS, the frontend offers a responsive design that works seamlessly across desktop and mobile devices.

**3. Firebase Authentication:**
Secures user access through anonymous authentication, maintaining privacy while enabling personalized experiences. This allows users to access the service without creating accounts while still providing a secure environment.

**4. Token Exchange:**
Cloud Functions handle the conversion between Firebase tokens and GCP tokens, ensuring secure API access. This critical security layer prevents unauthorized access to the translation services and user data.

**5. Chrome + WebAI:**
Browser-based interface where users interact with the application through text input or audio recording. The interface is designed to be intuitive and accessible, with clear visual feedback during the translation process.

**6. Whisper API:**
Transcribes audio input to text, enabling voice-based interaction with the system. This powerful speech recognition service handles various accents, speech patterns, and background noise conditions.

**7. ASL Translation Workflow:**
Core processing pipeline that:
- Checks sentence cache in Firestore
- Translates non-English text to English using Cloud Translation API
- Creates ASL gloss using Vertex AI (Gemini 2.0 Flash)
- Matches ASL video segments from the database
- Updates the sentence cache for future use
- Outputs the final ASL video

**8. Workflow Connection:**
Secure connection between the frontend and backend workflow, passing authenticated requests for processing. This ensures that all communication between components is encrypted and verified.

This architecture enables seamless translation from text or speech to sign language videos, with performance optimization through caching and cloud-based processing. The modular design allows for easy scaling and future enhancements.

## Technical Implementation

### Core Technologies

Our solution leverages several cutting-edge technologies:

- **Frontend**: React.js with Tailwind CSS for responsive design
- **Cloud Platform**: Google Cloud Platform (GCP)
- **AI Models**:
  - Gemini 2.0 Flash for ASL generation
  - Whisper API for speech recognition
- **Storage Solutions**:
  - Firestore for structured data
  - Cloud Storage for video files
- **Processing Tools**:
  - Cloud Translation API
  - ComfyUI for video processing
  - Cloud Functions for authentication

### AI Model Application

The Gemini 2.0 Flash AI model is the heart of our translation system. It converts English text into ASL gloss notation through a sophisticated process:

1. **Natural Language Understanding**: The model analyzes the semantic structure and context of the input text, understanding the meaning beyond just the words.

2. **Sign Language Generation**: It then decomposes the text into basic units, maps them to sign symbols, and optimizes the grammar structure according to ASL rules. This involves:
   - Removing unnecessary articles and prepositions
   - Converting to ALL CAPS format
   - Preserving nouns, verbs, adjectives, and conjunctions
   - Maintaining original word order
   - Ensuring proper spacing between words

3. **Quality Enhancement**: The output undergoes context-aware refinement to ensure natural expression, cultural adaptation, and expression accuracy.

The prompt used for Gemini AI includes specific rules:
```
Convert to ASL gloss notation using only words from our dataset. Rules:

1. ALL CAPS for ALL words
2. Topic-Comment structure: Place topic first, then comment (e.g., "STORE I GO" not "I GO STORE")
3. Keep: nouns, verbs, adjectives, adverbs, numbers, pronouns, AND/OR/BUT/IF/BECAUSE
4. Remove: a/an/the, be verbs (am/is/are/was/were), most prepositions
5. Time markers at beginning: YESTERDAY, TOMORROW, MORNING, AFTERNOON, NIGHT, NEXT_WEEK, FINISH
6. For questions: use question words (WHAT, WHERE, WHO, WHY, HOW) in original position
7. Negation: Use NOT after the verb (e.g., "I don't like" becomes "I LIKE NOT")
8. For continuous actions: Repeat word (e.g., "walking continuously" becomes "WALK WALK")
9. Geographic locations: Use exact country/city names from dataset (e.g., AMERICA, CHINA, NEW_YORK, HONG_KONG)
10. NO punctuation marks of any kind
11. Use space between words

Examples:
- "I am going to the store tomorrow" → "TOMORROW STORE I GO"
- "Do you want coffee or tea?" → "YOU WANT COFFEE OR TEA"
- "She doesn't understand the question" → "SHE UNDERSTAND NOT QUESTION"
- "The man in the blue shirt is my brother" → "MAN BLUE SHIRT BROTHER"
- "I have been waiting for a long time" → "I WAIT WAIT LONG TIME"
- "I want to visit New York next year" → "NEXT_YEAR I WANT VISIT NEW_YORK"

Return ONLY gloss words in a single line without any punctuation, extra spaces or newlines. Use ONLY words from our ASL dataset.
```

### Video Generation Process

Once the ASL gloss notation is generated, our video mapping algorithm:

1. **Symbol Analysis**: Parses the sign language symbol sequence, identifies compound expressions, and determines temporal relationships.

2. **Video Matching**: Matches each symbol with standard sign videos from our database, combining them for complex expressions and optimizing transitions for a natural flow.

3. **Performance Optimization**: Implements local caching of frequent segments, context-based preloading, and streaming optimization to ensure smooth playback.

### ASL Translation Workflow

Our core processing pipeline executes the translation process through a series of precisely defined steps. The following breakdown illustrates the flow based on different caching scenarios, referencing steps in the `backend/asl-workflow/workflow.yaml` file.

#### Scenario 1: Cache Miss

When the system processes a sentence for the first time or cannot find a corresponding record in the cache, it executes the following full workflow. We use the Chinese input "我想買咖啡" as an example; this flow also applies to English input (which would simply skip the translation step).

1.  **Receive Input**: Receives user text input. **Input:** `args` (e.g., `{"text": "我想買咖啡"}`). **Output:** `input_text` ("我想買咖啡"). (YAML: `main`, `validateInput`)
    ```yaml
    # workflow.yaml snippet (Input Validation)
    - validateInput:
        switch:
          - condition: ${"text" in args}
            assign:
              - input_text: ${args.text} # Output
            next: logInput
          # ...
    ```
    ```json
    // Example: Chinese Input Log
    {
      "jsonPayload": {
        "start": {
          "argument": {
            "text": "我想買咖啡"
          }
        }
      },
      "timestamp": "2025-03-29T18:00:45.032787353Z"
    }
    ```

2.  **Cache Check (Miss)**: Looks up `input_text` in Firestore cache. **Input:** `input_text` ("我想買咖啡"). **Output:** Cache not found (404 Error, `cache_result` is null). (YAML: `checkSentenceCache`)
    ```yaml
    # workflow.yaml snippet (Cache Check - Miss Path)
    - checkSentenceCache:
        try:
          call: googleapis.firestore.v1.projects.databases.documents.get
          args:
            name: ${... + input_text} # Input
          result: cache_result # Output (null on miss)
        except:
          # ... handles error, proceeds to next step ...
          steps:
            - continueToLangDetect:
                next: callDetectLanguage
    ```
    ```json
    // Example: Cache Miss for Chinese Input (Error message parsed)
    {
      "textPayload": {
        "message_prefix": "Cache check error: ",
        "error_details": { /* ... 404 details ... */ }
      },
      "timestamp": "2025-03-29T18:00:45.843691192Z"
    }
    ```

3.  **Language Detection**: Detects language of `input_text`. **Input:** `input_text` ("我想買咖啡"). **Output:** `detection_result` (e.g., languageCode "zh-TW"). (YAML: `callDetectLanguage`)
    ```yaml
    # workflow.yaml snippet (Language Detection)
    - callDetectLanguage:
        call: googleapis.translate.v3.projects.locations.detectLanguage
        args:
          body:
            content: ${input_text} # Input
        result: detection_result # Output
    ```
    ```json
    // Example: Detected Traditional Chinese
    {
      "textPayload": "zh-TW",
      "timestamp": "2025-03-29T18:00:46.362543476Z"
    }
    ```

4.  **Intermediate Translation (Conditional)**: Translates non-English `input_text` to English. **Input:** `input_text`, `detection_result`. **Output:** `english_text` ("I want to buy coffee"). (YAML: `translateIfNeeded`, `callTranslateText`, `setEnglishText`)
    ```yaml
    # workflow.yaml snippet (Conditional Translation)
    - translateIfNeeded:
        switch:
          - condition: ${detection_result.languages[0].languageCode == "en"}
            # ... skip ...
          - condition: ${true} # If not English
            next: callTranslateText
    - callTranslateText:
        call: googleapis.translate.v3.projects.locations.translateText
        args:
          body:
            contents: ${input_text} # Input
            sourceLanguageCode: ${detection_result.languages[0].languageCode} # Input
            # ...
        result: translation_result # Intermediate Output
    - setEnglishText:
        assign:
          - english_text: ${translation_result.translations[0].translatedText} # Output
    ```
    ```json
    // Example: Chinese input translated to English
    {
      "textPayload": "I want to buy coffee",
      "timestamp": "2025-03-29T18:00:46.904554817Z"
    }
    ```

5.  **ASL Gloss Conversion**: Converts `english_text` to ASL Gloss using Gemini. **Input:** `english_text` ("I want to buy coffee"). **Output:** `gloss_text` ("I WANT BUY COFFEE"). (YAML: `prepareGeminiRequest`, `callGenerateGloss`, `processGlossResult`)
    ```yaml
    # workflow.yaml snippet (Gemini Call & Processing)
    - prepareGeminiRequest:
        assign:
          - combinedText: ${promptString + " " + english_text} # Input for next step
    - callGenerateGloss:
        call: http.post
        args:
          body:
            contents:
              - parts:
                  - text: ${combinedText} # Input
        result: gloss_result # Intermediate Output
    - processGlossResult:
        switch:
          - condition: ${...} # Check valid response
            assign:
              - gloss_text: ${...} # Output (Extracted Gloss)
            # ...
    ```
    ```json
    // Example: Gemini API Response (from Chinese input workflow)
    {
      "textPayload": {
        "body": {
          "candidates": [ { "content": { "parts": [ { "text": "I WANT BUY COFFEE\n" } ] }, /* ... */ } ],
          /* ... */
        },
        /* ... */
      },
      "timestamp": "2025-03-29T18:00:47.551136861Z"
    }
    // The system then extracts the Gloss: "I WANT BUY COFFEE"
    ```

6.  **Video URL Mapping**: Maps each word in `gloss_text` to a video URL from Firestore. **Input:** `gloss_text` ("I WANT BUY COFFEE"). **Output:** `video_mappings` (list of {gloss, video_url} objects). (YAML: `splitGlossText`, `processMapping` loop with `queryVideo`)
    ```yaml
    # workflow.yaml snippet (Video Mapping Loop - Query & Add)
    - splitGlossText:
        assign:
          - characters: ${text.split(gloss_text, " ")} # Input for loop
    - processMapping:
        switch:
          - condition: ${current_index < len(characters)}
            steps:
              - queryVideo:
                  call: googleapis.firestore.v1.projects.databases.documents.get
                  args:
                    name: ${... + characters[current_index]} # Input (current gloss)
                  result: current_result # Intermediate Output
              - addMapping:
                  assign:
                    - video_mappings: ${list.concat(video_mappings, current_mapping)} # Output (growing list)
                    # ... increment index ...
                  next: processMapping
          # ...
    ```
    ```json
    // Example: Looking up video URL for Gloss "I"
    {
      "textPayload": { /* ... Firestore document for "I" ... */ },
      "timestamp": "2025-03-29T18:00:48.196208948Z"
    }
    // ... Lookups for WANT, BUY, COFFEE follow ...
    ```

7.  **Cache Storage**: Stores the result in Firestore cache. **Input:** `input_text`, `gloss_text`, `video_mappings`. **Output:** Cache document created/updated (`save_result`). (YAML: `saveSentenceCache`)
    ```yaml
    # workflow.yaml snippet (Cache Storage)
    - saveSentenceCache:
        call: googleapis.firestore.v1.projects.databases.documents.createDocument
        args:
          documentId: ${input_text} # Input
          body:
            fields:
              gloss_text:
                stringValue: ${gloss_text} # Input
              video_mappings:
                arrayValue:
                  values: ${video_mappings} # Input
              # ...
        result: save_result # Output
    ```

8.  **Return Result (Cache Miss)**: Formats and returns the final result. **Input:** `input_text`, `gloss_text`, `video_mappings`. **Output:** Final `result` object (containing original_input, gloss, videos). (YAML: `prepareResult`, `returnResult`)
    ```yaml
    # workflow.yaml snippet (Prepare & Return Result)
    - prepareResult:
        steps:
          # ... loop to simplify video_mappings ...
          - createResult:
              assign:
                - result: # Output
                    original_input: ${input_text} # Input
                    gloss: ${gloss_text} # Input
                    videos: ${simplified_videos} # Input (from loop)
    - returnResult:
        return: ${result} # Output
    ```
    ```json
    // Example: Final result for Chinese input (Cache Miss, result parsed)
    {
      "jsonPayload": {
        "success": {
          "result": { /* ... final result object ... */ }
        },
        "state": "SUCCEEDED"
      },
      "timestamp": "2025-03-29T18:00:50.004836399Z"
    }
    ```

#### Scenario 2: Cache Hit

When the system finds a matching record for the input text in the cache, the workflow is significantly simplified. We use the English input "I want buy coffee" as an example:

1.  **Receive Input**: Receives user text input. **Input:** `args` (e.g., `{"text": "I want buy coffee"}`). **Output:** `input_text` ("I want buy coffee"). (YAML: `main`, `validateInput`)
    ```yaml
    # workflow.yaml snippet (Input Handling)
    main:
      params: [args]
      # ...
    ```
    ```json
    // Example: English Input
    {
      "jsonPayload": {
        "start": {
          "argument": {
            "text": "I want buy coffee"
          }
        }
      },
      "timestamp": "2025-03-29T17:49:34.252173592Z"
    }
    ```

2.  **Cache Check (Hit)**: Looks up `input_text` in Firestore cache and finds a record. **Input:** `input_text` ("I want buy coffee"). **Output:** `cache_result` (Firestore document), `has_cache` (true). (YAML: `checkSentenceCache`, `processCacheResult` -> `checkCache`)
    ```yaml
    # workflow.yaml snippet (Cache Check - Success Path)
    - checkSentenceCache:
        try:
          call: googleapis.firestore.v1.projects.databases.documents.get
          args:
            name: ${... + input_text} # Input
          result: cache_result # Output (document found)
        # ... except block is skipped ...
        next: processCacheResult
    # workflow.yaml snippet (Confirm Cache Hit)
    - processCacheResult:
        steps:
          - checkCache:
              assign:
                - has_cache: ${cache_result != null and ...} # Output: true
          # ...
    ```
    ```json
    // Example: Cache Hit for English Input (Showing partial mapping)
    {
      "textPayload": { /* ... Firestore document ... */ },
      "timestamp": "2025-03-29T17:49:35.189564765Z"
    }
    // Confirming Cache Hit (Plain text)
    {
      "textPayload": "Cache check result: I want buy coffee",
      "timestamp": "2025-03-29T17:49:35.428965133Z"
    }
    ```

3.  **Skip Processing Steps**: Workflow skips intermediate steps due to cache hit. **Input:** `has_cache` (true). **Output:** Control flow jumps to result preparation. (YAML: `processCacheResult` -> `decidePath` -> `useCache`)
    ```yaml
    # workflow.yaml snippet (Cache Hit Logic)
    - processCacheResult:
        steps:
          # ...
          - decidePath:
              switch:
                - condition: ${has_cache} # Input: true
                  steps:
                    - useCache:
                        steps:
                          - assignBasics: # Assigns cached data
                              assign:
                                - gloss_text: ${cache_result.fields.gloss_text.stringValue} # Output
                                - video_mappings: ${cache_result.fields.video_mappings.arrayValue.values} # Output
                        next: prepareResult # Jump
                # ...
    ```

4.  **Return Result (Cache Hit)**: Formats and returns the final result using cached data. **Input:** `input_text`, cached `gloss_text`, cached `video_mappings`. **Output:** Final `result` object. (YAML: `prepareResult`, `returnResult`)
    ```yaml
    # workflow.yaml snippet (Prepare & Return Result)
    - prepareResult:
        steps:
          # ... loop to simplify video_mappings ...
          - createResult:
              assign:
                - result: # Output
                    original_input: ${input_text} # Input
                    gloss: ${gloss_text} # Input (from cache)
                    videos: ${simplified_videos} # Input (from cache)
    - returnResult:
        return: ${result} # Output
    ```
    ```json
    // Example: Final Success Result (result parsed)
    {
      "jsonPayload": {
        "success": {
          "result": { /* ... final result object ... */ }
        },
        "state": "SUCCEEDED"
      },
      "timestamp": "2025-03-29T17:49:35.822585487Z"
    }
    ```

This updated workflow more accurately reflects how the system handles different language inputs and how the caching mechanism optimizes performance.

### Database Structure

Our system uses Firestore collections to store various types of data:

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

**Detailed Description**:
- `profile`: User profile object
  - `created_at`: Account creation timestamp
  - `last_active`: Last activity timestamp
  - `usage_count`: Service usage counter

Supports anonymous access while tracking basic usage statistics.

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

**Detailed Description**:
- `user_id`: User identifier (anonymous or registered)
- `timestamp`: Translation request time
- `input_text`: Original user input text
- `output_gloss`: Generated ASL gloss notation
- `success_status`: Translation success indicator
- `processing_time`: Translation duration in seconds

Stores translation history for analysis and system improvement.

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

**Detailed Description**:
- `gloss_text`: ASL gloss notation (primary key)
- `timestamp`: Cache creation/update time
- `video_mappings`: Sign-to-video mapping array:
  - `gloss`: Individual ASL sign
  - `video_url`: Video file URL

Optimizes performance by caching video mappings for quick retrieval.

**asl_mappings Collection**
```json
{
    "gloss": "TEST",
    "video_url": "https://storage.googleapis.com/genasl-video-files/TEST.mp4"
}
```

**Detailed Description**:
- `gloss`: ASL sign text representation (primary key)
- `video_url`: Video URL

Core dictionary that maps ASL signs to video files for scalable sign language representation.

This database design enables efficient data storage and retrieval while optimizing system performance through strategic caching.

## Conclusion

The GenAI-powered Global Sign Language Translator represents a significant step forward in making communication more accessible and inclusive. By leveraging cutting-edge AI technologies like Gemini 2.0 Flash and cloud-based architecture on Google Cloud Platform, we've created a solution that can bridge the gap between spoken/written language and sign language in real-time.

Our system not only demonstrates the practical application of generative AI for social good but also showcases how thoughtful architecture design can create efficient, scalable, and user-friendly solutions. The combination of AI-powered translation, video mapping, and performance optimization through caching enables a responsive experience that works across devices and languages.

As we continue to expand our ASL video dataset and refine our translation algorithms, the system will become even more accurate and comprehensive. Future enhancements may include support for additional sign languages beyond ASL, more sophisticated video generation techniques, and expanded educational features to help users learn sign language more effectively.

By making sign language more accessible to the general public, we hope to foster greater understanding and inclusion of the deaf community in everyday communication. This project demonstrates how technology can be harnessed not just for convenience, but for creating a more connected and inclusive world.
