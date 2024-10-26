import functions_framework
from google.cloud import firestore
import json
import datetime
import logging

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def gloss_to_video(request):
    # Set CORS headers
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }

    try:
        # 記錄請求
        logger.info("Received request")
        
        # 獲取請求數據
        request_json = request.get_json()
        if not request_json or 'gloss' not in request_json:
            logger.error("No gloss provided in request")
            return json.dumps({
                'error': 'No ASL gloss provided',
                'timestamp': datetime.datetime.utcnow().isoformat()
            }), 400, headers

        # 記錄收到的 gloss
        logger.info(f"Received gloss: {request_json['gloss']}")

        try:
            # 初始化 Firestore 客戶端
            db = firestore.Client()
            logger.info("Firestore client initialized")
        except Exception as e:
            logger.error(f"Error initializing Firestore: {str(e)}")
            return json.dumps({
                'error': f'Firestore initialization error: {str(e)}',
                'timestamp': datetime.datetime.utcnow().isoformat()
            }), 500, headers
        
        # 解析輸入的 gloss
        gloss_words = request_json['gloss'].strip().upper().split()
        logger.info(f"Processing gloss words: {gloss_words}")
        
        video_mappings = []

        # 在 Firestore 中查找每個 gloss 對應的影片
        for gloss in gloss_words:
            try:
                logger.info(f"Looking up gloss: {gloss}")
                
                doc_ref = db.collection('asl_mappings').document(gloss)
                doc = doc_ref.get()
                
                if not doc.exists:
                    logger.warning(f"No mapping found for gloss: {gloss}")
                    return json.dumps({
                        'error': f'No mapping found for gloss: {gloss}',
                        'timestamp': datetime.datetime.utcnow().isoformat()
                    }), 404, headers
                
                # 獲取影片信息
                video_data = doc.to_dict()
                logger.info(f"Found video data for {gloss}: {video_data}")

                # 構建公開訪問 URL
                public_url = f"https://storage.googleapis.com/genasl-video-files/{video_data['video_path']}"
                
                mapping = {
                    'gloss': gloss,
                    'video_path': video_data['video_path'],
                    'video_url': public_url,
                    'duration': video_data.get('duration', 0),
                    'metadata': video_data.get('metadata', {})
                }
                video_mappings.append(mapping)
                
            except Exception as e:
                logger.error(f"Error processing gloss {gloss}: {str(e)}")
                return json.dumps({
                    'error': f'Error processing gloss {gloss}: {str(e)}',
                    'timestamp': datetime.datetime.utcnow().isoformat()
                }), 500, headers

        result = {
            'video_mappings': video_mappings,
            'total_clips': len(video_mappings),
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
        logger.info("Successfully processed request")
        
        return json.dumps(result), 200, headers

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return json.dumps({
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 500, headers