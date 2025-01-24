"""
ASL Sign Language Translation Service

This module provides functionality to convert text into ASL (American Sign Language) gloss notation.
Supports multi-language input using Google Cloud services and Gemini AI for processing.

Key Features:
- Multi-language input support
- Intelligent gloss matching
- Cache system for performance optimization
- Error recovery mechanisms

Flow:
1. Text cleaning and normalization
2. Language detection and translation
3. ASL gloss generation using Gemini AI
4. Gloss validation and matching
"""

import functions_framework
import json
import google.generativeai as genai
import os
from google.cloud import firestore
from google.cloud import translate
from thefuzz import fuzz
import logging
import re
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GlossCache:
    """
    Gloss notation cache manager
    
    A singleton cache system for managing and storing ASL gloss notations.
    Implements cache backup and error recovery mechanisms.
    """
    _instance = None
    _cache = set()
    _last_update = None
    _db = None
    _update_interval = timedelta(hours=24)
    _error_count = 0
    _max_errors = 3
    
    def __init__(self):
        """Initialize cache manager"""
        if not GlossCache._db:
            GlossCache._db = firestore.Client()
        self._backup_cache = set()  # Backup cache
    
    @classmethod
    def get_instance(cls):
        """Get cache instance"""
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_cache()
        return cls._instance
    
    def _load_cache(self):
        """Load glosses into cache with backup"""
        try:
            # Load new data
            docs = self._db.collection('asl_mappings').stream()
            new_cache = {doc.id for doc in docs}
            
            # Validate new data
            if len(new_cache) < 100:  # Basic validation
                raise ValueError("Suspiciously small number of glosses loaded")
                
            # Update successful, reset error count
            self._backup_cache = self._cache  # Backup current cache
            self._cache = new_cache
            self._last_update = datetime.now()
            self._error_count = 0
            
            logger.info(f"Cache successfully loaded with {len(self._cache)} glosses")
            
        except Exception as e:
            self._error_count += 1
            logger.error(f"Error loading cache (attempt {self._error_count}): {e}")
            
            if self._backup_cache and self._error_count <= self._max_errors:
                logger.info("Using backup cache")
                self._cache = self._backup_cache
            else:
                raise
    
    def _needs_update(self):
        """Check if cache needs updating with adaptive interval"""
        if not self._last_update:
            return True
            
        time_since_update = datetime.now() - self._last_update
        
        # Adjust interval based on error count
        if self._error_count > 0:
            adjusted_interval = self._update_interval * (1 + self._error_count)
            return time_since_update > adjusted_interval
            
        return time_since_update > self._update_interval
    
    def get_glosses(self):
        """Get cached glosses with performance logging"""
        try:
            start_time = datetime.now()
            
            if self._needs_update():
                self._load_cache()
                
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            logger.info(f"Cache access completed in {duration:.3f} seconds")
            
            return self._cache
            
        except Exception as e:
            logger.error(f"Error accessing cache: {e}")
            if self._backup_cache:
                logger.info("Falling back to backup cache")
                return self._backup_cache
            raise

class ASLGlossConverter:
    """ASL Gloss Converter"""
    def __init__(self):
        try:
            # Use cached glosses
            self.gloss_cache = GlossCache.get_instance()
            self.available_glosses = self.gloss_cache.get_glosses()

            # Initialize Translation client
            self.translate_client = translate.TranslationServiceClient()
            self.project_id = "genasl"  # Your GCP project ID
            self.location = "global"
            self.parent = f"projects/{self.project_id}/locations/{self.location}"

            # Initialize Gemini
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                raise ValueError("GEMINI_API_KEY not found in environment variables")
            genai.configure(api_key=api_key)
            
            # Configure Gemini 2.0 Flash with optimized settings
            self.model = genai.GenerativeModel(
                model_name="gemini-2.0-flash-exp",
                generation_config={
                    "temperature": 0.1,     # Low temperature for consistency
                    "top_p": 0.8,           # Reduced for faster decisions
                    "top_k": 20,            # Reduced candidates
                    "max_output_tokens": 100,  # Limited output length
                    "candidate_count": 1     # Single response
                }
            )
            
            logger.info("ASLGlossConverter initialized successfully with Gemini 2.0 Flash")
        except Exception as e:
            logger.error(f"Failed to initialize ASLGlossConverter: {e}")
            raise

    def _clean_text(self, text):
        """Clean and normalize input text"""
        try:
            text = ' '.join(text.split())
            text = re.sub(r'[^a-zA-Z0-9\s\.,!?\u4e00-\u9fff\u3040-\u309F\u30A0-\u30FF]', '', text)
            return text.strip()
        except Exception as e:
            logger.error(f"Error cleaning text: {e}")
            raise

    def detect_language(self, text):
        """Detect the language of the text"""
        try:
            logger.info(f"Detecting language for text: {text}")
            
            request = {
                "parent": self.parent,
                "content": text,
                "mime_type": "text/plain"
            }
            
            response = self.translate_client.detect_language(request=request)
            detected_language = response.languages[0].language_code
            
            logger.info(f"Detected language: {detected_language}")
            return detected_language
            
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            raise

    def translate_text(self, text):
        """Translate text to English using Google Cloud Translation API"""
        try:
            logger.info(f"Starting translation for text: {text}")
            
            # Detect language
            source_language = self.detect_language(text)
            
            # If already English, return as is
            if source_language == 'en':
                logger.info("Text is already in English")
                return text

            # Translate to English
            request = {
                "parent": self.parent,
                "contents": [text],
                "mime_type": "text/plain",
                "source_language_code": source_language,
                "target_language_code": "en"
            }

            response = self.translate_client.translate_text(request=request)
            translated_text = response.translations[0].translated_text
            
            logger.info(f"Translation successful: {translated_text}")
            return translated_text

        except Exception as e:
            logger.error(f"Translation error: {e}")
            raise

    def find_best_gloss_match(self, word):
        """Find best matching ASL gloss using fuzzy matching"""
        try:
            word = word.upper()
            if word in self.available_glosses:
                return word

            best_match = None
            highest_ratio = 0
            
            for gloss in self.available_glosses:
                ratio = fuzz.ratio(word, gloss)
                if ratio > highest_ratio and ratio > 80:
                    highest_ratio = ratio
                    best_match = gloss
                    
            if best_match:
                logger.info(f"Found fuzzy match for '{word}': '{best_match}' with ratio {highest_ratio}")
            else:
                logger.warning(f"No suitable match found for word: {word}")
                
            return best_match
            
        except Exception as e:
            logger.error(f"Error in fuzzy matching: {e}")
            raise

    def convert_text_to_gloss(self, text):
        """Convert text to ASL gloss notation"""
        try:
            # Clean input text
            cleaned_text = self._clean_text(text)
            logger.info(f"Processing text: {cleaned_text}")

            # Translate text to English
            english_text = self.translate_text(cleaned_text)
            logger.info(f"Translated text: {english_text}")

            # Build optimized Gemini prompt
            prompt = f"""Convert to ASL gloss notation. Rules:
1. ALL CAPS
2. Keep: nouns, verbs, adjectives, AND/OR/BUT
3. Remove: a/an/the, unnecessary prepositions
4. Original word order
5. Space between words
6. No punctuation

Text: {english_text}

Return ONLY gloss words."""

            # Call Gemini API
            try:
                response = self.model.generate_content(prompt)
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
                raise

            # Clean and process response
            raw_gloss = response.text.strip().upper()
            words = raw_gloss.split()
            
            final_words = []
            replacements = {}
            skipped_words = []
            
            for word in words:
                logger.info(f"Processing word: {word}")
                clean_word = ''.join(c for c in word if c.isalnum())
                if not clean_word:
                    continue

                if clean_word in self.available_glosses:
                    final_words.append(clean_word)
                    logger.info(f"Word '{clean_word}' found in glosses")
                else:
                    match = self.find_best_gloss_match(clean_word)
                    if match:
                        final_words.append(match)
                        if match != clean_word:
                            replacements[clean_word] = match
                            logger.info(f"Word '{clean_word}' matched to '{match}'")
                    else:
                        skipped_words.append(clean_word)
                        logger.warning(f"Skipped word with no match: {clean_word}")

            # Validate results
            if not final_words:
                raise ValueError("No valid ASL glosses found for the input text")

            result = {
                'original_text': text,
                'cleaned_text': cleaned_text,
                'english_text': english_text,
                'gloss': ' '.join(final_words),
                'replacements': replacements,
                'word_count': len(final_words),
                'skipped_words': skipped_words,
                'success': True
            }

            logger.info(f"Successfully converted text to gloss: {result['gloss']}")
            return result

        except Exception as e:
            logger.error(f"Error converting text to gloss: {str(e)}")
            raise

@functions_framework.http
def text_to_gloss(request):
    """HTTP Cloud Function for text-to-gloss conversion."""
    
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
        # Validate request
        request_json = request.get_json()
        if not request_json or 'text' not in request_json:
            return json.dumps({
                'error': 'No text provided',
                'success': False
            }), 400, headers

        text = request_json['text']
        if not text.strip():
            return json.dumps({
                'error': 'Empty text provided',
                'success': False
            }), 400, headers

        # Process the text
        converter = ASLGlossConverter()
        result = converter.convert_text_to_gloss(text)
        
        return json.dumps(result), 200, headers
        
    except Exception as e:
        logger.error(f"Service error: {str(e)}")
        error_response = {
            'error': str(e),
            'details': 'Error processing text to gloss conversion',
            'success': False
        }
        return json.dumps(error_response), 500, headers
