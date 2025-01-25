"""
ASL Text to Gloss Translation Service

This module provides functionality to convert text into ASL (American Sign Language) gloss notation. 
It supports multi-language input and uses Google Cloud services and Gemini AI for processing.

Key Features:
- Multi-language support
- Intelligent gloss matching
- Fast in-memory cache
- Error handling and logging

Flow:
1. Text cleaning and normalization
2. Language detection and translation
3. Gloss generation using Gemini AI
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
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GlossCache:
    """Lightweight gloss validation cache manager"""
    
    _instance = None
    _cache = set()
    _initialized = False
    _db = None
    
    def __init__(self):
        """Initialize cache manager with Firestore connection"""
        if not GlossCache._db:
            GlossCache._db = firestore.Client()
            logger.info("Firestore client initialized")
    
    @classmethod
    def get_instance(cls):
        """Get cache singleton instance"""
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
            start_time = datetime.now()
            logger.info("Starting to load gloss data to cache")
            
            # Load all valid gloss words
            docs = self._db.collection('asl_mappings').stream()
            self._cache = {doc.id for doc in docs}
            
            if len(self._cache) < 100:  # Basic validation
                raise ValueError(f"Suspiciously small number of glosses loaded: {len(self._cache)}")
            
            self._initialized = True
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            logger.info(f"Cache loaded successfully with {len(self._cache)} glosses in {duration:.3f} seconds")
            
        except Exception as e:
            logger.error(f"Cache initialization failed: {e}")
            raise
    
    def get_glosses(self):
        """Get all cached glosses"""
        return self._cache

class ASLGlossConverter:
    """
    Core processor for text to ASL gloss conversion.
    
    Handles the complete pipeline of converting text input
    to ASL gloss notation, including language detection,
    translation, and gloss matching.
    """
    
    def __init__(self):
        """Initialize converter with required services and models"""
        try:
            # Use cached glosses
            self.gloss_cache = GlossCache.get_instance()
            self.available_glosses = self.gloss_cache.get_glosses()

            # Initialize Translation client
            self.translate_client = translate.TranslationServiceClient()
            self.project_id = "genasl"
            self.location = "global"
            self.parent = f"projects/{self.project_id}/locations/{self.location}"

            # Initialize Gemini
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                raise ValueError("GEMINI_API_KEY not found in environment variables")
            genai.configure(api_key=api_key)
            
            self.model = genai.GenerativeModel(
                model_name="gemini-2.0-flash-exp",
                generation_config={
                    "temperature": 0.1,
                    "top_p": 0.8,
                    "top_k": 20,
                    "max_output_tokens": 100,
                    "candidate_count": 1
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
        """Translate text to English"""
        try:
            logger.info(f"Starting translation for text: {text}")
            
            source_language = self.detect_language(text)
            
            if source_language == 'en':
                logger.info("Text is already in English")
                return text

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
            # Clean and translate text
            cleaned_text = self._clean_text(text)
            logger.info(f"Processing text: {cleaned_text}")

            english_text = self.translate_text(cleaned_text)
            logger.info(f"Translated text: {english_text}")

            # Generate gloss using Gemini AI
            prompt = f"""Convert to ASL gloss notation. Rules:
1. ALL CAPS
2. Keep: nouns, verbs, adjectives, AND/OR/BUT
3. Remove: a/an/the, unnecessary prepositions
4. Original word order
5. Space between words
6. No punctuation

Text: {english_text}

Return ONLY gloss words."""

            try:
                response = self.model.generate_content(prompt)
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
                raise

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
    """HTTP handler for text to gloss conversion"""
    
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
        # Get request data
        request_json = request.get_json()
        if not request_json or 'text' not in request_json:
            logger.error("No text provided in request")
            return json.dumps({
                'error': 'No text provided',
                'success': False
            }), 400, headers

        text = request_json['text']
        if not text.strip():
            logger.error("Empty text provided")
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