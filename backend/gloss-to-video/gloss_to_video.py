"""
ASL Sign Language Video Conversion Service

This module provides functionality to convert ASL (American Sign Language) gloss sequences 
to corresponding videos. It uses a caching system to optimize performance when querying 
video data from Firestore database.

Key Features:
- Process gloss sequences
- Fast video mapping through cache system
- Generate video access URLs
- Provide video metadata

"""

import functions_framework
from google.cloud import firestore
import json
import datetime
import logging
from typing import Dict, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoCache:
    """Video data cache manager"""
    
    _instance = None
    _cache: Dict = {}
    _backup_cache: Dict = {}
    _last_update = None
    _update_interval = datetime.timedelta(hours=24)
    _db = None
    _error_count = 0
    _max_errors = 3
    
    def __init__(self):
        """Initialize cache manager"""
        if not VideoCache._db:
            VideoCache._db = firestore.Client()
            logger.info("Firestore client initialized successfully")
    
    @classmethod
    def get_instance(cls):
        """Get cache singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_cache()
        return cls._instance
    
    def _load_cache(self):
        """Load video data from Firestore to cache"""
        try:
            logger.info("Starting to load video data to cache")
            docs = self._db.collection('asl_mappings').stream()
            
            new_cache = {}
            count = 0
            
            for doc in docs:
                data = doc.to_dict()
                # Pre-build public access URL
                public_url = f"https://storage.googleapis.com/genasl-video-files/{data['video_path']}"
                
                new_cache[doc.id] = {
                    'video_path': data['video_path'],
                    'video_url': public_url,
                    'duration': data.get('duration', 0),
                    'metadata': data.get('metadata', {})
                }
                count += 1
            
            if count < 100:  # Basic validation
                raise ValueError(f"Suspiciously small number of videos loaded: {count}")
                
            self._backup_cache = self._cache  # Backup current cache
            self._cache = new_cache
            self._last_update = datetime.datetime.now()
            self._error_count = 0
            
            logger.info(f"Cache loaded successfully with {count} video mappings")
            
        except Exception as e:
            self._error_count += 1
            logger.error(f"Cache loading error (attempt {self._error_count}): {str(e)}")
            
            if self._backup_cache and self._error_count <= self._max_errors:
                logger.info("Using backup cache")
                self._cache = self._backup_cache
            else:
                raise
    
    def _needs_update(self) -> bool:
        """Check if cache needs updating"""
        if not self._last_update:
            return True
            
        time_since_update = datetime.datetime.now() - self._last_update
        
        # Adjust interval based on error count
        if self._error_count > 0:
            adjusted_interval = self._update_interval * (1 + self._error_count)
            return time_since_update > adjusted_interval
            
        return time_since_update > self._update_interval
    
    def get_video_data(self, gloss: str) -> Optional[Dict]:
        """Get video data, update cache if needed"""
        try:
            start_time = datetime.datetime.now()
            
            if self._needs_update():
                self._load_cache()
            
            video_data = self._cache.get(gloss.upper())
            
            end_time = datetime.datetime.now()
            duration = (end_time - start_time).total_seconds()
            logger.info(f"Cache access completed in {duration:.3f} seconds")
            
            return video_data
            
        except Exception as e:
            logger.error(f"Error getting video data: {str(e)}")
            if self._backup_cache:
                logger.info("Using backup cache")
                return self._backup_cache.get(gloss.upper())
            raise

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
        # Log request
        logger.info("Request received")
        
        # Get request data
        request_json = request.get_json()
        if not request_json or 'gloss' not in request_json:
            logger.error("No gloss provided in request")
            return json.dumps({
                'error': 'No ASL gloss provided',
                'timestamp': datetime.datetime.utcnow().isoformat()
            }), 400, headers

        # Log received gloss
        logger.info(f"Received gloss: {request_json['gloss']}")

        try:
            # Get cache instance
            cache = VideoCache.get_instance()
            logger.info("Cache system initialized successfully")
        except Exception as e:
            logger.error(f"Cache system initialization error: {str(e)}")
            return json.dumps({
                'error': f'Cache system initialization error: {str(e)}',
                'timestamp': datetime.datetime.utcnow().isoformat()
            }), 500, headers
        
        # Parse input gloss
        gloss_words = request_json['gloss'].strip().upper().split()
        logger.info(f"Processing gloss words: {gloss_words}")
        
        video_mappings = []

        # Get video for each gloss from cache
        for gloss in gloss_words:
            try:
                logger.info(f"Looking up gloss: {gloss}")
                
                video_data = cache.get_video_data(gloss)
                if not video_data:
                    logger.warning(f"No video mapping found for gloss: {gloss}")
                    return json.dumps({
                        'error': f'No video mapping found for gloss: {gloss}',
                        'timestamp': datetime.datetime.utcnow().isoformat()
                    }), 404, headers
                
                logger.info(f"Found video data for {gloss}")
                
                # Build video mapping
                mapping = {
                    'gloss': gloss,
                    **video_data  # Spread cached video data
                }
                video_mappings.append(mapping)
                
            except Exception as e:
                logger.error(f"Error processing gloss {gloss}: {str(e)}")
                return json.dumps({
                    'error': f'Error processing gloss {gloss}: {str(e)}',
                    'timestamp': datetime.datetime.utcnow().isoformat()
                }), 500, headers

        # Build response
        result = {
            'video_mappings': video_mappings,      # List of video mappings
            'total_clips': len(video_mappings),    # Total number of video clips
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
        logger.info("Request processed successfully")
        
        return json.dumps(result), 200, headers

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return json.dumps({
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 500, headers