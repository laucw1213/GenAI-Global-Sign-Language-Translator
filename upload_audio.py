import functions_framework
from flask import jsonify
from flask_cors import cross_origin
from google.cloud import storage
import uuid

@functions_framework.http
@cross_origin()
def upload_audio(request):
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # 生成唯一的文件名
        filename = f"{uuid.uuid4()}-{file.filename}"
        
        # 上傳到 Cloud Storage
        bucket_name = 'genasl-audio-files'
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(filename)
        
        # 設置內容類型
        content_type = file.content_type
        blob.upload_from_string(
            file.read(),
            content_type=content_type
        )

        return jsonify({
            'success': True,
            'file_path': filename
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500
