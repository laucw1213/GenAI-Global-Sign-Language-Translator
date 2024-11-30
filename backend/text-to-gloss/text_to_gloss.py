import functions_framework
import json
import google.generativeai as genai
import os
from google.cloud import firestore
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
            self.db = firestore.Client()
            self.available_glosses = self._load_available_glosses()
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                raise ValueError("GEMINI_API_KEY not found in environment variables")
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-pro')
            logger.info("ASLGlossConverter initialized successfully")
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
            # Remove extra spaces and normalize whitespace
            text = ' '.join(text.split())
            # Remove special characters but keep basic punctuation
            text = re.sub(r'[^a-zA-Z0-9\s\.,!?\u4e00-\u9fff]', '', text)
            return text.strip()
        except Exception as e:
            logger.error(f"Error cleaning text: {e}")
            raise

    def find_best_gloss_match(self, word):
        """Find best matching ASL gloss using fuzzy matching"""
        try:
            word = word.upper()
            # Direct match
            if word in self.available_glosses:
                return word

            # Fuzzy match
            best_match = None
            highest_ratio = 0
            
            for gloss in self.available_glosses:
                ratio = fuzz.ratio(word, gloss)
                if ratio > highest_ratio and ratio > 80:  # 80% similarity threshold
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
        """Convert English/Chinese text to ASL gloss"""
        try:
            # Clean input text
            cleaned_text = self._clean_text(text)
            logger.info(f"Processing text: {cleaned_text}")

            # Bilingual support prompt
            prompt = f"""
            Convert this English or Chinese text to ASL gloss notation.
            Follow these rules strictly:
            1. Use ALL CAPITAL LETTERS
            2. Keep important connecting words like AND/和/與, OR/或者, BUT/但是
            3. Keep every content word (nouns, verbs, adjectives)
            4. Remove only articles (a, an, the) and unnecessary prepositions
            5. Keep words in original order
            6. Do not add any extra words
            7. Do not combine or merge words
            8. Each word should be separated by a single space
            9. No punctuation in the output
            10. For Chinese input, translate to English ASL gloss first

            English or Chinese text: {cleaned_text}

            Return ONLY the ASL gloss words in CAPITALS, separated by spaces.
            Here are some examples:

            Example 1:
            Input: "The government and education support the economic" or "政府和教育支持經濟"
            Output: GOVERNMENT AND EDUCATION SUPPORT ECONOMIC

            Example 2:
            Input: "Republican and policy discuss economic" or "共和黨和政策討論經濟"
            Output: REPUBLICAN AND POLICY DISCUSS ECONOMIC

            Now convert the following text to ASL gloss following the same pattern:
            {cleaned_text}
            """

            # Call Gemini API
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.1,
                    'top_p': 0.9,
                    'top_k': 40,
                    'max_output_tokens': 100,
                }
            )

            # Clean and process response
            raw_gloss = response.text.strip().upper()
            words = raw_gloss.split()
            
            # Process each word
            final_words = []
            replacements = {}
            skipped_words = []
            
            for word in words:
                # Clean word
                clean_word = ''.join(c for c in word if c.isalnum())
                if not clean_word:
                    continue

                if clean_word in self.available_glosses:
                    final_words.append(clean_word)
                else:
                    match = self.find_best_gloss_match(clean_word)
                    if match:
                        final_words.append(match)
                        if match != clean_word:
                            replacements[clean_word] = match
                    else:
                        skipped_words.append(clean_word)
                        logger.warning(f"Skipped word with no match: {clean_word}")

            # Validate results
            if not final_words:
                raise ValueError("No valid ASL glosses found for the input text")

            result = {
                'original_text': text,
                'cleaned_text': cleaned_text,
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