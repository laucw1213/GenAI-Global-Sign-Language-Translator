import React, { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';

export function TextInput({ onSubmit, disabled }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Based on test results, these are the languages that work successfully
  const workingLanguages = {
    bn: /[\u0980-\u09FF]/, // Bengali
    es: /[áéíóúüñ¿¡]/i,    // Spanish
    hi: /[\u0900-\u097F]/, // Hindi
    ja: /[\u3040-\u30FF\u31F0-\u31FF]/, // Japanese
    pt: /[áéíóúãõàèìòùâêîôûç]/i, // Portuguese
    ru: /[\u0400-\u04FF]/, // Russian
    tr: /[ğıİöüşç]/i,      // Turkish
    vi: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, // Vietnamese
    zh: /[\u4E00-\u9FFF]/, // Chinese (Simplified)
    'zh-Hant': /[\u4E00-\u9FFF]/ // Chinese (Traditional)
  };

  // Improved language detection function
  const detectLanguage = (text) => {
    // Check the characteristics of each language
    for (const [lang, pattern] of Object.entries(workingLanguages)) {
      if (pattern.test(text)) {
        return lang;
      }
    }
    
    // If no special characters, assume English
    return 'en';
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsProcessing(true);
    setError("");

    try {
      if (window.ai?.translator) {
        const sourceLanguage = detectLanguage(text);
        console.log(`Detected language: ${sourceLanguage}`);

        try {
          const translator = await window.ai.translator.create({
            sourceLanguage,
            targetLanguage: "en"
          });

          if (translator) {
            const translatedText = await translator.translate(text.trim());
            console.log(`Translation result: ${translatedText}`);
            onSubmit(translatedText);
            setText("");
            
            if (typeof translator.destroy === 'function') {
              translator.destroy();
            }
            return;
          }
        } catch (translationError) {
          console.warn(`Translation failed for language ${sourceLanguage}:`, translationError);
          setError(`Unable to translate this language: ${sourceLanguage}`);
        }
      }

      // If translation fails or is unavailable, use the original text
      console.log('Using original text');
      onSubmit(text.trim());
      setText("");
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "An error occurred during processing");
      onSubmit(text.trim());
    } finally {
      setIsProcessing(false);
    }
  }, [text, onSubmit]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center p-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        Supported languages: Bengali, Spanish, Hindi, Japanese, Portuguese, Russian, Turkish, Vietnamese, Chinese
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || isProcessing}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          placeholder="Please enter text (supports multiple languages)..."
          rows="4"
        />
        
        <button
          type="submit"
          disabled={disabled || isProcessing || !text.trim()}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Translate and Convert to Sign Language"
          )}
        </button>
      </form>
    </div>
  );
}