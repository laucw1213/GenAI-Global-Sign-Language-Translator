import React, { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';

export function TextInput({ onSubmit, disabled }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 根據測試結果，這些是成功工作的語言
  const workingLanguages = {
    bn: /[\u0980-\u09FF]/, // 孟加拉文
    es: /[áéíóúüñ¿¡]/i,    // 西班牙文
    hi: /[\u0900-\u097F]/, // 印地文
    ja: /[\u3040-\u30FF\u31F0-\u31FF]/, // 日文
    pt: /[áéíóúãõàèìòùâêîôûç]/i, // 葡萄牙文
    ru: /[\u0400-\u04FF]/, // 俄文
    tr: /[ğıİöüşç]/i,      // 土耳其文
    vi: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, // 越南文
    zh: /[\u4E00-\u9FFF]/, // 中文（簡體）
    'zh-Hant': /[\u4E00-\u9FFF]/ // 中文（繁體）
  };

  // 改進的語言檢測函數
  const detectLanguage = (text) => {
    // 檢查每種語言的特徵
    for (const [lang, pattern] of Object.entries(workingLanguages)) {
      if (pattern.test(text)) {
        return lang;
      }
    }
    
    // 如果沒有特殊字符，假設為英文
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
          setError(`無法翻譯此語言: ${sourceLanguage}`);
        }
      }

      // 如果翻譯失敗或不可用，使用原文
      console.log('Using original text');
      onSubmit(text.trim());
      setText("");
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "處理過程中發生錯誤");
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
        支援的語言：孟加拉文、西班牙文、印地文、日文、葡萄牙文、俄文、土耳其文、越南文、中文
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || isProcessing}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          placeholder="請輸入文字（支援多國語言）..."
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
              處理中...
            </span>
          ) : (
            "翻譯並轉換為手語"
          )}
        </button>
      </form>
    </div>
  );
}