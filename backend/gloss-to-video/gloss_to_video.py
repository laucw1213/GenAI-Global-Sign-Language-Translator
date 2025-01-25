"""
ASL Sign Language Video Conversion Service

This module provides functionality to convert ASL (American Sign Language) gloss sequences 
to corresponding videos. Uses a lightweight cache system for optimal performance.

Key Features:
- Process gloss sequences with minimal latency
- In-memory video mapping for fast access
- Generate video access URLs
- Provide video metadata

"""

import functions_framework
from google.cloud import firestore
import json
import datetime
import logging
from typing import Dict, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoCache:
    """Lightweight video data cache manager"""
    
    _instance = None
    _cache: Dict = {}
    _initialized = False
    _db = None
    
    @classmethod
    def get_instance(cls):
        """Get singleton cache instance"""
        if cls._instance is None:
            cls._instance = cls()
        if not cls._initialized:
            cls._instance._init_cache()
        return cls._instance
    
    def _init_cache(self):
        """One-time initialization of cache"""
        if self._initialized:
            return
            
        try:
            logger.info("Initializing video cache")
            if not self._db:
                self._db = firestore.Client()
                
            # Load all video mappings
            docs = self._db.collection('asl_mappings').stream()
            
            # Pre-build all mappings
            for doc in docs:
                data = doc.to_dict()
                self._cache[doc.id] = {
                    'video_path': data['video_path'],
                    'video_url': f"https://storage.googleapis.com/genasl-video-files/{data['video_path']}",
                    'duration': data.get('duration', 0),
                    'metadata': data.get('metadata', {})
                }
                
            self._initialized = True
            logger.info(f"Cache initialized with {len(self._cache)} entries")
            
        except Exception as e:
            logger.error(f"Cache initialization failed: {e}")
            raise

    def get_video_mappings(self, gloss_words: List[str]) -> List[Dict]:
        """Fast batch retrieval of video mappings"""
        video_mappings = []
        
        for gloss in gloss_words:
            data = self._cache.get(gloss.upper())
            if not data:
                raise ValueError(f"No video mapping found for gloss: {gloss}")
                
            mapping = {
                'gloss': gloss.upper(),
                **data
            }
            video_mappings.append(mapping)
            
        return video_mappings

@functions_framework.http
def gloss_to_video(request):
    """HTTP handler for gloss to video conversion"""
    
    # Handle CORS
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
        request_json = request.get_json()
        if not request_json or 'gloss' not in request_json:
            return json.dumps({
                'error': 'No ASL gloss provided',
                'timestamp': datetime.datetime.utcnow().isoformat()
            }), 400, headers

        try:
            # Get cache instance and process gloss words
            cache = VideoCache.get_instance()
            gloss_words = request_json['gloss'].strip().upper().split()
            
            # Get all video mappings in one go
            video_mappings = cache.get_video_mappings(gloss_words)
            
            result = {
                'video_mappings': video_mappings,
                'total_clips': len(video_mappings),
                'timestamp': datetime.datetime.utcnow().isoformat()
            }
            
            return json.dumps(result), 200, headers

        except ValueError as e:
            return json.dumps({
                'error': str(e),
                'timestamp': datetime.datetime.utcnow().isoformat()
            }), 404, headers

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return json.dumps({
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 500, headers