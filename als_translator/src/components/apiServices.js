// apiServices.js

const HUGGING_FACE_TOKEN = "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";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Simple logging utility
const logger = {
  logLevels: {
    INFO: '📘',
    API: '🌐',
    SUCCESS: '✅',
    ERROR: '❌'
  },

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `${this.logLevels[level]} [${timestamp}] ${message}`;
    
    if (data) {
      console.log(logMessage + '\n  ' + Object.entries(data)
        .map(([key, value]) => `${key}: "${value}"`)
        .join('\n  '));
    } else {
      console.log(logMessage);
    }
  }
};

// Language detection patterns
const workingLanguages = {
  bn: /[\u0980-\u09FF]/,    // Bengali
  es: /[áéíóúüñ¿¡]/i,       // Spanish
  hi: /[\u0900-\u097F]/,    // Hindi
  ja: /[\u3040-\u30FF\u31F0-\u31FF]/, // Japanese
  pt: /[áéíóúãõàèìòùâêîôûç]/i, // Portuguese
  ru: /[\u0400-\u04FF]/,    // Russian
  tr: /[ğıİöüşç]/i,         // Turkish
  vi: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, // Vietnamese
  zh: /[\u4E00-\u9FFF]/,    // Chinese (Simplified)
  'zh-Hant': /[\u4E00-\u9FFF]/ // Chinese (Traditional)
};

// Error classes
class TranslationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TranslationError';
  }
}

class TranscriptionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

// Language detection
export const detectLanguage = (text) => {
  logger.log('INFO', 'Detecting language');
  
  if (!text) {
    logger.log('INFO', 'No text provided, defaulting to English');
    return 'en';
  }
  
  for (const [lang, pattern] of Object.entries(workingLanguages)) {
    if (pattern.test(text)) {
      logger.log('SUCCESS', 'Language detected', { Language: lang });
      return lang;
    }
  }
  
  logger.log('INFO', 'No specific language detected, defaulting to English');
  return 'en';
};

// Audio processing utilities
const processAudioBlob = async (blob) => {
  logger.log('INFO', 'Processing audio blob', {
    Size: `${(blob.size / 1024).toFixed(2)} KB`,
    Type: blob.type
  });

  try {
    const arrayBuffer = await blob.arrayBuffer();
    logger.log('SUCCESS', 'Audio processing complete');
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    logger.log('ERROR', 'Audio processing failed', { Error: error.message });
    throw new TranscriptionError('Failed to process audio data');
  }
};

// Whisper API service
export const transcribeAudio = async (audioData) => {
  logger.log('INFO', 'Starting audio transcription');

  if (!audioData) {
    logger.log('ERROR', 'No audio data provided');
    throw new TranscriptionError('No audio data provided');
  }

  return retryWithDelay(async () => {
    try {
      let processedData;
      if (audioData instanceof Blob) {
        processedData = await processAudioBlob(audioData);
      } else {
        processedData = audioData;
      }

      logger.log('API', 'Sending request to Whisper API');

      const response = await fetch(
        "https://api-inference.huggingface.co/models/openai/whisper-base",
        {
          headers: { 
            Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          body: processedData
        }
      );

      if (!response.ok) {
        throw new TranscriptionError(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      const transcribedText = result.text || result;

      logger.log('SUCCESS', 'Transcription Result:', {
        Text: transcribedText
      });

      return {
        success: true,
        text: transcribedText
      };
    } catch (error) {
      logger.log('ERROR', 'Transcription failed', { Error: error.message });
      throw new TranscriptionError(error.message || 'Transcription failed');
    }
  });
};

// Translation service
export const translateText = async (text) => {
  logger.log('INFO', 'Starting translation process');

  if (!text?.trim()) {
    logger.log('ERROR', 'No text provided for translation');
    throw new TranslationError('No text provided for translation');
  }

  if (!window.ai?.translator) {
    logger.log('INFO', 'Translation service not available, returning original text');
    return text;
  }

  return retryWithDelay(async () => {
    let translator = null;
    try {
      const sourceLanguage = detectLanguage(text);
      
      logger.log('API', 'Translation Request:', {
        Source: text,
        'Detected Language': sourceLanguage
      });

      translator = await window.ai.translator.create({
        sourceLanguage,
        targetLanguage: "en"
      });

      if (!translator) {
        throw new TranslationError('Failed to create translator instance');
      }

      const translatedText = await translator.translate(text.trim());
      
      logger.log('SUCCESS', 'Translation Complete:', {
        Result: translatedText
      });

      return translatedText;
    } catch (error) {
      logger.log('ERROR', 'Translation failed', { Error: error.message });
      throw new TranslationError(error.message || 'Translation failed');
    } finally {
      if (translator?.destroy) {
        await translator.destroy();
        logger.log('INFO', 'Translator instance destroyed');
      }
    }
  });
};

// Rate limiting
const rateLimiter = {
  tokens: 10,
  lastRefill: Date.now(),
  refillRate: 1000,
  maxTokens: 10,

  async acquire() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const refillAmount = Math.floor(timePassed / this.refillRate);
    
    if (refillAmount > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount);
      this.lastRefill = now;
    }

    if (this.tokens <= 0) {
      const waitTime = this.refillRate - (now - this.lastRefill);
      logger.log('INFO', 'Rate limit reached, waiting', { 'Wait Time': `${waitTime}ms` });
      await sleep(waitTime);
      return this.acquire();
    }

    this.tokens--;
    return true;
  }
};

// Cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const withCache = async (key, fn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.log('INFO', 'Cache hit', { Key: key });
    return cached.value;
  }

  logger.log('INFO', 'Cache miss, fetching new data', { Key: key });
  const result = await fn();
  
  cache.set(key, {
    value: result,
    timestamp: Date.now()
  });
  
  return result;
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithDelay = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      logger.log('INFO', 'Operation failed, retrying', {
        'Attempts Left': retries - 1,
        'Next Retry In': `${delay}ms`
      });
      await sleep(delay);
      return retryWithDelay(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Combined service
export const processContent = async (content, type = 'text') => {
  logger.log('INFO', 'Starting content processing', { Type: type });

  try {
    await rateLimiter.acquire();

    const cacheKey = `${type}:${typeof content === 'string' ? content : content.size}`;
    
    const result = await withCache(cacheKey, async () => {
      if (type === 'text') {
        return translateText(content);
      } else if (type === 'audio') {
        // First get transcription from Whisper API
        const transcriptionResult = await transcribeAudio(content);
        if (!transcriptionResult.success) {
          throw new Error('Transcription failed');
        }
        
        logger.log('INFO', 'Transcription successful, proceeding to translation', {
          'Transcribed Text': transcriptionResult.text
        });
        
        // Translate the transcribed text
        const translatedText = await translateText(transcriptionResult.text);
        
        // Return in the format that workflow expects
        return {
          success: true,
          text: translatedText  // Changed from returning {original, translated} to just the translated text
        };
      } else {
        throw new Error('Unsupported content type');
      }
    });

    logger.log('SUCCESS', 'Content processing complete');
    return result;
  } catch (error) {
    logger.log('ERROR', 'Content processing failed', { Error: error.message });
    throw error;
  }
};

// Export available languages
export const getSupportedLanguages = () => {
  logger.log('INFO', 'Getting supported languages');
  return Object.keys(workingLanguages);
};

export const debug = {
  clearCache: () => {
    cache.clear();
    logger.log('INFO', 'Cache cleared');
  },
  
  resetRateLimiter: () => {
    rateLimiter.tokens = rateLimiter.maxTokens;
    rateLimiter.lastRefill = Date.now();
    logger.log('INFO', 'Rate limiter reset');
  }
};

// Initialize
logger.log('INFO', 'API Services initialized');