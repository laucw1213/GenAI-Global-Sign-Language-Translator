import functions_framework
import json
import google.generativeai as genai
import os

@functions_framework.http
def text_to_gloss(request):
    # Set CORS headers
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    request_json = request.get_json()
    
    if not request_json or 'text' not in request_json:
        return json.dumps({'error': 'No text provided'}), 400
    
    try:
        # Configure Gemini API
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        
        # Initialize the model (Gemini 1.5 Pro)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        prompt = f"""
        You are an ASL (American Sign Language) expert. 
        Convert the following English text to ASL gloss notation.
        
        Rules for ASL gloss:
        1. Use ALL CAPITAL letters
        2. Remove unnecessary words (articles, some prepositions)
        3. Follow ASL grammar structure (Time-Topic-Comment)
        4. Keep essential meaning
        5. Include non-manual markers when necessary (marked with appropriate symbols)
        
        English text: {request_json['text']}
        
        Respond with ONLY the ASL gloss, no explanations.
        """
        
        response = model.generate_content(
            prompt,
            generation_config={
                'temperature': 0.2,
                'top_p': 0.8,
                'top_k': 40,
            }
        )
        
        # Clean up the response and ensure it's in correct format
        gloss = response.text.strip().upper()
        
        return json.dumps({
            'gloss': gloss,
            'original_text': request_json['text']
        }), 200
        
    except Exception as e:
        print(f"Error: {str(e)}")  # Add logging
        return json.dumps({'error': str(e)}), 500