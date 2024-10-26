from google.cloud import speech_v1
import functions_framework
import json
import base64

@functions_framework.http
def speech_to_text(request):
    # Set CORS headers
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    try:
        request_json = request.get_json()
        
        if not request_json or 'content' not in request_json:
            return json.dumps({'error': 'No audio content provided'}), 400

        # Get audio content and decode if it's base64 encoded
        audio_content = request_json['content']
        if isinstance(audio_content, str):
            try:
                audio_content = base64.b64decode(audio_content)
            except Exception as e:
                return json.dumps({'error': f'Base64 decoding failed: {str(e)}'}), 400

        # Create Speech-to-Text client
        client = speech_v1.SpeechClient()
        
        # Configure audio
        audio = speech_v1.RecognitionAudio(content=audio_content)
        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=44100,
            language_code='en-US',
            enable_automatic_punctuation=True,
            audio_channel_count=1
        )
        
        # Send request to Speech-to-Text API
        response = client.recognize(config=config, audio=audio)
        
        # Process results
        text_result = ""
        for result in response.results:
            text_result += result.alternatives[0].transcript
        
        return json.dumps({'text': text_result}), 200
        
    except Exception as e:
        return json.dumps({'error': str(e)}), 500