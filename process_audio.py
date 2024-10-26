from google.cloud import storage
import functions_framework
from flask import jsonify, request
import base64
import soundfile as sf
import io
import numpy as np
from pydub import AudioSegment
import tempfile

@functions_framework.http
def process_audio(request):
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    try:
        request_json = request.get_json()
        if not request_json or 'file_path' not in request_json:
            return jsonify({'error': 'file_path is required'}), 400, headers

        file_path = request_json['file_path']
        bucket_name = 'genasl-audio-files'

        # Get file extension
        file_ext = file_path.split('.')[-1].lower()

        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_path)

        if not blob.exists():
            return jsonify({'error': 'File not found'}), 404, headers

        # Download the audio file
        audio_content = blob.download_as_bytes()

        # Convert audio to WAV format if needed
        with tempfile.NamedTemporaryFile(suffix=f'.{file_ext}') as temp_in:
            temp_in.write(audio_content)
            temp_in.flush()

            if file_ext in ['mp3', 'm4a']:
                # Convert to WAV using pydub
                audio = AudioSegment.from_file(temp_in.name, format=file_ext)
                
                with tempfile.NamedTemporaryFile(suffix='.wav') as temp_wav:
                    audio.export(temp_wav.name, format='wav')
                    # Read the converted WAV file
                    data, samplerate = sf.read(temp_wav.name)
            else:
                # Direct WAV file processing
                data, samplerate = sf.read(temp_in.name)

        # Convert to mono if stereo
        if len(data.shape) > 1:
            mono_data = np.mean(data, axis=1)
        else:
            mono_data = data

        # Save mono audio to bytes
        output_io = io.BytesIO()
        sf.write(output_io, mono_data, samplerate, format='WAV')
        mono_content = output_io.getvalue()
        
        # Convert to base64
        base64_content = base64.b64encode(mono_content).decode('utf-8')

        return jsonify({
            'content': base64_content,
            'sample_rate': samplerate,
            'format': 'wav'
        }), 200, headers

    except Exception as e:
        return jsonify({'error': str(e)}), 500, headers