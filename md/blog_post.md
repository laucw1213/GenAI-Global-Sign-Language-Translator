# Breaking Barriers: GenAI-powered Global Sign Language Translator on Google Cloud Platform
---

## Introduction

In today's digital age, effective communication is essential for fostering inclusivity and breaking down barriers. However, for individuals who rely on visual communication methods like American Sign Language (ASL), traditional communication tools often fall short. This is where the GenAI-powered Global Sign Language Translator comes in.

Our innovative solution leverages the power of Gemini 2.0 Flash AI to convert multilingual text and speech into expressive American Sign Language videos within seconds. By bridging the gap between spoken and written language and sign language, we're not just creating a technological solution—we're fostering a more inclusive world where communication barriers no longer create gaps between people.

Sign language is not merely a communication tool but an essential part of deaf culture and identity. Through modern technology, we aim to provide a convenient tool for the general public to communicate easily with the deaf community, promoting social inclusion and enhancing understanding of deaf culture.

**Try it now:** [ASL Translator](https://genasl.web.app/)
**demo video:**

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

### ASL Translation Workflow

Our core processing pipeline executes the translation process through a series of precisely defined steps. The following breakdown illustrates the flow based on different caching scenarios, referencing steps in the `backend/asl-workflow/workflow.yaml` file.

#### Scenario 1: Cache Miss

When the system processes a sentence for the first time or cannot find a corresponding record in the cache, it executes the following full workflow. We use the Chinese input "我想買咖啡" as an example; this flow also applies to English input (which would simply skip the translation step).

1.  **Receive Input**: Validates and extracts the user's text input.

    **Input JSON:**
    ```json
    {
      "text": "我想買咖啡"
    }
    ```
    **YAML:**
    ```yaml
    main:
      params: [args]
      steps:
        - init:
            assign:
              # ... initialization ...
        - validateInput:
            switch:
              - condition: ${"text" in args}
                assign:
                  - input_text: ${args.text}
                next: logInput # Or next processing step
              # ... error handling ...
    ```
    **Output JSON:**
    ```json
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

2.  **Cache Check (Miss)**: Checks the Firestore cache for the input text.

    **Input JSON:** Input JSON refers to the Step 1 output JSON.
    **YAML:**
    ```yaml
    - checkSentenceCache:
        try:
          call: googleapis.firestore.v1.projects.databases.documents.get
          args:
            name: ${"projects/" + project_id + "/databases/(default)/documents/sentence_cache/" + input_text}
          result: cache_result
        except:
          as: e
          steps:
            - logCacheError: # Log the error
                call: sys.log
                args:
                  text: '${"Cache check error: " + json.encode_to_string(e)}'
            - continueToLangDetect: # Proceed to next step
                next: callDetectLanguage
    ```
    **Output JSON:**
    ```json
    {
      "textPayload": {
        "message_prefix": "Cache check error: ",
        "error_details": {
          "body": {
            "error": {
              "code": 404,
              "message": "Document \"projects/genasl/databases/(default)/documents/sentence_cache/我想買咖啡\" not found.",
              "status": "NOT_FOUND"
            }
          }
        }
      },
      "timestamp": "2025-03-29T18:00:45.843691192Z"
    }
    ```

3.  **Language Detection**: Detects the language of the input text.

    **Input JSON:** Input JSON refers to the Step 1 output JSON.
    **YAML:**
    ```yaml
    - callDetectLanguage:
        call: googleapis.translate.v3.projects.locations.detectLanguage
        args:
          parent: ${"projects/" + project_id + "/locations/global"}
          body:
            content: ${input_text}
            mimeType: "text/plain"
        result: detection_result
    ```
    **Output JSON:**
    ```json
    {
      "textPayload": "zh-TW",
      "timestamp": "2025-03-29T18:00:46.362543476Z"
    }
    ```

4.  **Intermediate Translation (Conditional)**: Translates the input text to English if it's not English.

    **Input JSON:** Input JSON refers to the Step 1 and Step 3 output JSON.
    **YAML:**
    ```yaml
    - translateIfNeeded:
        switch:
          - condition: ${detection_result.languages[0].languageCode == "en"}
            assign:
              - english_text: ${input_text} # Assign original if English
            next: logEnglishText
          - condition: ${true} # If not English
            next: callTranslateText
    - callTranslateText:
        call: googleapis.translate.v3.projects.locations.translateText
        args:
          parent: ${"projects/" + project_id + "/locations/global"}
          body:
            contents: ${input_text}
            sourceLanguageCode: ${detection_result.languages[0].languageCode}
            targetLanguageCode: "en"
            mimeType: "text/plain"
        result: translation_result
    - setEnglishText:
        assign:
          - english_text: ${translation_result.translations[0].translatedText}
    ```
    **Output JSON:**
    ```json
    {
      "textPayload": "I want to buy coffee", // "我想買咖啡" -> "I want to buy coffee"
      "timestamp": "2025-03-29T18:00:46.904554817Z"
    }
    ```

5.  **ASL Gloss Conversion**: Converts the English text into ASL Gloss notation using Gemini.

    **Input JSON:** Input JSON refers to the Step 4 output JSON.
    **YAML:**
    ```yaml
    - prepareGeminiRequest:
        assign:
          # ... promptString assignment ...
          - combinedText: ${promptString + " " + english_text}
        next: callGenerateGloss
    - callGenerateGloss:
        call: http.post
        args:
          url: ${"https://us-central1-aiplatform.googleapis.com/v1/projects/" + project_id + "/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent"}
          auth:
            type: OAuth2
          body:
            contents:
              - role: "user"
                parts:
                  - text: ${combinedText}
        result: gloss_result
    - processGlossResult:
        switch:
          - condition: ${ "body" in gloss_result and "candidates" in gloss_result.body and gloss_result.body.candidates[0].content.parts[0].text != null }
            assign:
              # Extract and clean the gloss text
              - gloss_text: ${ text.replace_all_regex(gloss_result.body.candidates[0].content.parts[0].text, "\n", "") }
            next: logProcessedGloss
          # ... error handling ...
    ```
    **Output JSON:**
    ```json
    {
      "textPayload": {
        "body": {
          "candidates": [
            {
              "content": {
                "parts": [
                  {
                    // System extracts Gloss text from here
                    "text": "I WANT BUY COFFEE\n"
                  }
                ],
                "role": "model"
              },
              "finishReason": "STOP",
              "avgLogprobs": -0.000014902092516422272
            }
          ],
          "usageMetadata": {
            "promptTokenCount": 384,
            "candidatesTokenCount": 5,
            "totalTokenCount": 389
            // ... other metadata ...
          }
          // ... other response metadata ...
        },
        "code": 200,
        "headers": { /* ... Headers ... */ }
      },
      "timestamp": "2025-03-29T18:00:47.551136861Z"
    }
    // The system then extracts the Gloss: "I WANT BUY COFFEE"
    ```

6.  **Video URL Mapping**: Finds corresponding video URLs for each word in the ASL Gloss from Firestore.

    **Input JSON:** Input JSON refers to the Step 5 output JSON.
    **YAML:**
    ```yaml
    - splitGlossText:
        assign:
          - characters: ${text.split(gloss_text, " ")}
        next: initVideoMapping
    - initVideoMapping:
        assign:
          - video_mappings: []
          - current_index: 0
        next: processMapping
    - processMapping:
        switch:
          - condition: ${current_index < len(characters)}
            steps:
              - queryVideo:
                  try:
                    call: googleapis.firestore.v1.projects.databases.documents.get
                    args:
                      name: ${"projects/" + project_id + "/databases/(default)/documents/asl_mappings2/" + characters[current_index]}
                    result: current_result
                  # ... error handling ...
              - processResult:
                  switch:
                    - condition: ${ not("error" in current_result) and ... }
                      steps:
                        - addMapping:
                            assign:
                              - current_mapping: { /* ... construct mapping ... */ }
                              - video_mappings: ${list.concat(video_mappings, current_mapping)}
                              - current_index: ${current_index + 1}
                            next: processMapping # Loop back
                    # ... handle missing mapping ...
          - condition: ${true}
            next: saveSentenceCache # Exit loop
    ```
    **Output JSON:** (Shows example for one word lookup, repeats for others)
    ```json
    {
      "textPayload": {
        "createTime": "2025-03-25T19:51:19.599373Z",
        "fields": {
          "gloss": { "stringValue": "I" },
          "video_url": { "stringValue": "https://storage.googleapis.com/genasl-video-files/I.mp4" }
        },
        "name": "projects/genasl/databases/(default)/documents/asl_mappings2/I",
        "updateTime": "2025-03-25T19:51:19.599373Z"
      },
      "timestamp": "2025-03-29T18:00:48.196208948Z"
    }
    // Example: Looking up video URL for Gloss "WANT" (similar format)
    // ...
    // Example: Looking up video URL for Gloss "BUY" (similar format)
    // ...
    // Example: Looking up video URL for Gloss "COFFEE" (similar format)
    // ...
    ```

7.  **Cache Storage**: Stores the generated Gloss and video mappings in the Firestore cache.

    **Input JSON:** Input JSON refers to the Step 1, Step 5, and Step 6 output JSON.
    **YAML:**
    ```yaml
    - saveSentenceCache:
        try:
          call: googleapis.firestore.v1.projects.databases.documents.createDocument # Or patch if exists
          args:
            parent: ${"projects/" + project_id + "/databases/(default)/documents"}
            collectionId: "sentence_cache"
            documentId: ${input_text} # Uses original input as ID
            body:
              fields:
                gloss_text:
                  stringValue: ${gloss_text}
                video_mappings:
                  arrayValue:
                    values: ${video_mappings} # The list built in the loop
                timestamp:
                  timestampValue: ${time.format(sys.now())}
          result: save_result
        # ... error handling ...
    ```
    **Output JSON:**
    ```json
    {
        "gloss_text": "I WANT BUY COFFEE",
        "timestamp": "2025-02-14T04:49:17.311Z", // Example timestamp
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

8.  **Return Result (Cache Miss)**: Formats and returns the translation result (Gloss and video URLs).

    **Input JSON:** Input JSON refers to the Step 1, Step 5, and Step 6 output JSON.
    **YAML:**
    ```yaml
    - prepareResult:
        steps:
          # ... loop to simplify video_mappings into simplified_videos ...
          - createResult:
              assign:
                - result:
                    original_input: ${input_text}
                    gloss: ${gloss_text}
                    videos: ${simplified_videos}
              next: logSuccess
    - returnResult:
        return: ${result}
    ```
    **Output JSON:**
    ```json
    {
      "jsonPayload": {
        "success": {
          "result": {
            "gloss": "I WANT BUY COFFEE",
            "original_input": "我想買咖啡",
            "videos": [
              [
                {
                  "gloss": "I",
                  "video_url": "https://storage.googleapis.com/genasl-video-files/I.mp4"
                }
              ],
              [
                {
                  "gloss": "WANT",
                  "video_url": "https://storage.googleapis.com/genasl-video-files/WANT.mp4"
                }
              ],
              [
                {
                  "gloss": "BUY",
                  "video_url": "https://storage.googleapis.com/genasl-video-files/BUY.mp4"
                }
              ],
              [
                {
                  "gloss": "COFFEE",
                  "video_url": "https://storage.googleapis.com/genasl-video-files/COFFEE.mp4"
                }
              ]
            ]
          }
        },
        "state": "SUCCEEDED"
      },
      "timestamp": "2025-03-29T18:00:50.004836399Z"
    }
    ```

#### Scenario 2: Cache Hit

When the system finds a matching record for the input text in the cache, the workflow is significantly simplified. We use the English input "I want buy coffee" as an example:

1.  **Receive Input**: Validates and extracts the user's text input.

    **Input JSON:**
    ```json
    {
      "text": "I want buy coffee"
    }
    ```
    **YAML:**
    ```yaml
    main:
      params: [args]
      steps:
        - init:
            assign:
              # ... initialization ...
        - validateInput:
            switch:
              - condition: ${"text" in args}
                assign:
                  - input_text: ${args.text}
                next: logInput # Or next processing step
              # ... error handling ...
    ```
    **Output JSON:**
    ```json
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

2.  **Cache Check (Hit)**: Finds a matching record for the input text in the Firestore cache.

    **Input JSON:** Input JSON refers to the Step 1 output JSON.
    **YAML:**
    ```yaml
    - checkSentenceCache:
        try:
          call: googleapis.firestore.v1.projects.databases.documents.get
          args:
            name: ${"projects/" + project_id + "/databases/(default)/documents/sentence_cache/" + input_text}
          result: cache_result
        # ... except block is skipped ...
        next: processCacheResult
    # workflow.yaml snippet (Confirm Cache Hit)
    - processCacheResult:
        steps:
          # ... logCacheResult ...
          - checkCache:
              try:
                assign:
                  - has_cache: ${cache_result != null and ...} # Evaluates to true
                  - cache_log: '${"Cache check result: " + input_text}'
              # ... except block ...
          - logCacheStatus:
              call: sys.log
              args:
                text: '${cache_log}'
          # ... decidePath switch follows ...
    ```
    **Output JSON:** (Shows the retrieved cache document)
    ```json
    {
      "textPayload": {
        "fields": {
          "gloss_text": { "stringValue": "I WANT BUY COFFEE" },
          "video_mappings": {
            "arrayValue": {
              "values": [
                {
                  "mapValue": {
                    "fields": {
                      "gloss": { "stringValue": "I" },
                      "video_url": { "stringValue": "https://storage.googleapis.com/genasl-video-files/I.mp4" }
                    }
                  }
                },
                {
                  "mapValue": {
                    "fields": {
                      "gloss": { "stringValue": "WANT" },
                      "video_url": { "stringValue": "https://storage.googleapis.com/genasl-video-files/WANT.mp4" }
                    }
                  }
                }
                // ... subsequent mappings omitted ...
              ]
            }
          }
          // ... other fields omitted ...
        },
        "name": "projects/genasl/databases/(default)/documents/sentence_cache/I want buy coffee"
        // ... metadata like createTime, updateTime might be present ...
      },
      "timestamp": "2025-03-29T17:49:35.189564765Z"
    }
    ```

3.  **Skip Processing Steps**: Bypasses translation and Gloss generation steps due to the cache hit.

    **Input JSON:** Input JSON refers to the Step 2 output JSON.
    **YAML:**
    ```yaml
    - processCacheResult:
        steps:
          # ... logCacheResult, checkCache, logCacheStatus ...
          - decidePath:
              switch:
                - condition: ${has_cache} # Evaluates to true
                  steps:
                    - useCache:
                        steps:
                          - assignBasics:
                              assign:
                                - gloss_text: ${cache_result.fields.gloss_text.stringValue}
                                - video_mappings: ${cache_result.fields.video_mappings.arrayValue.values}
                                - english_text: ${input_text}
                        next: prepareResult
    ```
    *(No specific Output JSON shown for this control flow step)*

4.  **Return Result (Cache Hit)**: Formats and returns the cached translation result.

    **Input JSON:** Input JSON refers to the Step 1 and Step 2 output JSON.
    **YAML:**
    ```yaml
    - prepareResult:
        steps:
          # ... loop to simplify video_mappings ...
          - createResult:
              assign:
                - result:
                    original_input: ${input_text} # Uses the input text
                    gloss: ${gloss_text} # Uses cached gloss
                    videos: ${simplified_videos} # Uses cached mappings
              next: logSuccess
    - returnResult:
        return: ${result}
    ```
    **Output JSON:**
    ```json
    {
      "jsonPayload": {
        "success": {
          "result": {
            "gloss": "I WANT BUY COFFEE",
            "original_input": "I want buy coffee",
            "videos": [
              [
                {
                  "gloss": "I",
                  "video_url": "https://storage.googleapis.com/genasl-video-files/I.mp4"
                }
              ],
              [
                {
                  "gloss": "WANT",
                  "video_url": "https://storage.googleapis.com/genasl-video-files/WANT.mp4"
                }
              ],
              [
                {
                  "gloss": "BUY",
                  "video_url": "https://storage.googleapis.com/genasl-video-files/BUY.mp4"
                }
              ],
              [
                {
                  "gloss": "COFFEE",
                  "video_url": "https://storage.googleapis.com/genasl-video-files/COFFEE.mp4"
                }
              ]
            ]
          }
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
