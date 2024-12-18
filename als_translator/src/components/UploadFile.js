// UploadFile.js
import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { processContent } from './apiServices';

// iOS device detection regex
const IOS_REGEX = /iPhone|iPad|iPod/i;

export function UploadFile({ onTranscriptionComplete, disabled }) {
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

  const validateAudioFile = (file) => {
    // Extended supported file types
    const validTypes = [
      'audio/wav', 
      'audio/mpeg', 
      'audio/mp3', 
      'audio/mp4',
      'audio/m4a', 
      'audio/x-m4a',
      'audio/aac',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
      '', // iOS might not provide MIME type
    ];
    
    // Check file extensions
    const validExtensions = ['.wav', '.mp3', '.m4a', '.aac', '.mp4', '.webm', '.ogg'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    // Allow upload if file type is empty (iOS case) or file type/extension matches requirements
    if ((!file.type && hasValidExtension) || validTypes.includes(file.type)) {
      return true;
    }
    
    throw new Error('Unsupported file type. Please upload WAV, MP3, M4A, AAC, or similar audio files.');
  };

  const checkFileSize = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds limit. Maximum allowed size is 10MB.');
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
      checkFileSize(file);
      
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

  // Check if device is iOS
  const isIOS = IOS_REGEX.test(navigator.userAgent);

  // Special file type specification for iOS devices
  const getAcceptTypes = () => {
    if (isIOS) {
      return "audio/mp3,audio/m4a,audio/wav,audio/mpeg,audio/aac,audio/mp4,.mp3,.m4a,.wav,.aac,.mp4";
    }
    return "audio/*";
  };

  return (
    <div className="mt-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={getAcceptTypes()}
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
