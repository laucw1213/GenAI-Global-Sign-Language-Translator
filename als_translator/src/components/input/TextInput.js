// TextInput.js
import React, { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { processContent } from '../../services/api/apiServices';

export function TextInput({ onSubmit, disabled }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsProcessing(true);
    setError("");

    try {
      const processedResult = await processContent(text, 'text');
      onSubmit(processedResult.text.trim());
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
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || isProcessing}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          placeholder="Please enter text..."
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
