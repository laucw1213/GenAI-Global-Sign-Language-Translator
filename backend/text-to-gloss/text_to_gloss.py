import functions_framework
import json
import google.generativeai as genai
import os
from google.cloud import firestore
from google.cloud import translate
from thefuzz import fuzz
import logging
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ASLGlossConverter:
    def __init__(self):
        try:
            # Initialize Firestore client
            self.db = firestore.Client()
            self.available_glosses = self._load_available_glosses()

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
                    "temperature": 0.1,     # 保持低温度确保稳定性
                    "top_p": 0.8,         # 降低以加快决策
                    "top_k": 20,         # 减少候选数量
                    "max_output_tokens": 100,  # 限制输出长度，因为我们只需要简短回复
                    "candidate_count": 1  # 只生成一个候选答案
                }
            )
            
            logger.info("ASLGlossConverter initialized successfully with Gemini 2.0 Flash")
        except Exception as e:
            logger.error(f"Failed to initialize ASLGlossConverter: {e}")
            raise

    def _load_available_glosses(self):
        """Load available ASL glosses from Firestore"""
        try:
            glosses = set()
            docs = self.db.collection('asl_mappings').stream()
            for doc in docs:
                glosses.add(doc.id)
            logger.info(f"Loaded {len(glosses)} glosses from Firestore")
            return glosses
        except Exception as e:
            logger.error(f"Error loading glosses from Firestore: {e}")
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
        """Convert text to ASL gloss"""
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