// UploadFile.js
import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { processContent } from './apiServices';

export function UploadFile({ onTranscriptionComplete, disabled }) {
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

  const validateAudioFile = (file) => {
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/x-m4a'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload WAV, MP3, or M4A files.');
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB.');
    }
    
    return true;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    setUploadProgress(0);
    setProcessingStatus("Validating file...");
  
    try {
      validateAudioFile(file);
      
      setProcessingStatus("Processing audio file...");
      setUploadProgress(30);
      
      const result = await processContent(file, 'audio');
      
      setUploadProgress(90);
      
      if (result.success) {
        onTranscriptionComplete(result.text);
        setProcessingStatus("Processing complete!");
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
      
      setUploadProgress(100);
      
    } catch (error) {
      console.error('Processing error:', error);
      alert('Audio file processing error: ' + error.message);
    } finally {
      setTimeout(() => {
        setProcessingStatus("");
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    }
  };

  return (
    <div className="mt-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="audio/*"
        className="hidden"
        disabled={disabled}
      />
      
      <button
        onClick={() => fileInputRef.current.click()}
        disabled={disabled}
        className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="h-5 w-5 mr-2" />
        Upload Audio File
      </button>

      {/* Progress and Status */}
      {(uploadProgress > 0 || processingStatus) && (
        <div className="mt-2 space-y-2">
          {uploadProgress > 0 && (
            <div className="bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          {processingStatus && (
            <div className="flex items-center justify-center">
              {processingStatus === "Processing audio file..." && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2" />
              )}
              <p className="text-sm text-gray-600 text-center">{processingStatus}</p>
            </div>
          )}
        </div>
      )}

      <p className="mt-2 text-sm text-gray-500 text-center">
        Supports WAV, MP3, M4A formats (max 10MB)
      </p>
    </div>
  );
}