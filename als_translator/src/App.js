import React, { useState, useEffect } from "react";
import { TextInput } from "./components/TextInput";
import { AudioRecorder } from "./components/AudioRecorder";
import { ResultDisplay } from "./components/ResultDisplay";
import axios from "axios";
import { HandRaisedIcon } from "@heroicons/react/24/outline";

const WORKFLOW_URL = "https://workflowexecutions.googleapis.com/v1/projects/genasl/locations/asia-east1/workflows/asl-translation/executions";
const AUTH_URL = "https://asia-east1-genasl.cloudfunctions.net/get-auth-token";
const HUGGING_FACE_TOKEN = "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";

const FileUploadButton = ({ disabled, onTranscriptionComplete }) => {
  const fileInputRef = React.useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

  const queryWhisperAPI = async (audioBlob) => {
    setProcessingStatus("Transcribing audio...");
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const response = await fetch(
        "https://api-inference.huggingface.co/models/openai/whisper-base",
        {
          headers: { 
            Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          body: data
        }
      );

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();
      if (!result) {
        throw new Error('No valid transcription result');
      }

      return result;
    } catch (error) {
      console.error("Transcription error:", error);
      throw error;
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadProgress(0);
    setProcessingStatus("Processing audio file...");

    try {
      const result = await queryWhisperAPI(file);
      setProcessingStatus("Transcription successful!");
      
      if (result && (result.text || typeof result === 'object')) {
        const text = typeof result === 'object' ? result.text || JSON.stringify(result) : String(result);
        onTranscriptionComplete(text);
      } else {
        throw new Error("No valid transcription result");
      }
    } catch (error) {
      console.error('Processing error:', error);
      alert('Audio file processing error: ' + error.message);
    } finally {
      setProcessingStatus("");
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        Upload Audio File
      </button>

      {(uploadProgress > 0 || processingStatus) && (
        <div className="mt-2 space-y-2">
          {uploadProgress > 0 && (
            <div className="bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          {processingStatus && (
            <p className="text-sm text-gray-600 text-center">{processingStatus}</p>
          )}
        </div>
      )}

      <p className="mt-2 text-sm text-gray-500 text-center">
        Supports WAV, MP3, M4A formats
      </p>
    </div>
  );
};

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState(0);

  const refreshToken = async () => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.token) {
        setToken(data.token);
        setLastTokenRefresh(Date.now());
        setError(null);
      } else {
        throw new Error('Token not received');
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError("Authentication failed: " + err.message);
      setToken(null);
    }
  };

  useEffect(() => {
    refreshToken();
    const tokenRefreshInterval = setInterval(refreshToken, 50 * 60 * 1000);
    return () => clearInterval(tokenRefreshInterval);
  }, []);

  const handleRecordingComplete = async (result) => {
    if (!result || (!result.text && !result.success)) {
      setError('Could not get transcription result');
      return;
    }
  
    try {
      // 處理 API 返回的不同格式情況
      let text = '';
      if (result.success && typeof result.text === 'object') {
        // 如果 text 是對象，轉換為字符串
        text = JSON.stringify(result.text);
      } else if (result.success) {
        // 如果是普通文本
        text = String(result.text).trim();
      } else if (typeof result === 'object') {
        // 直接從 API 返回的結果中獲取文本
        text = result.text || JSON.stringify(result);
      } else {
        // 其他情況，轉換為字符串
        text = String(result).trim();
      }
  
      // 確保文本格式正確
      const textForProcess = text.replace(/['"{}[\]]/g, '').trim();
      
      // 傳遞給工作流
      await processText(textForProcess);
    } catch (error) {
      console.error('處理錄音結果錯誤:', error);
      setError(error.message || '處理錄音結果時發生錯誤');
    }
  };
  
  const processText = async (text) => {
    if (!token) {
      setError("Authentication required");
      return;
    }
  
    if (!text.trim()) {
      setError("Please enter text");
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
      
      // 確保文本格式正確
      const requestBody = {
        argument: JSON.stringify({ 
          text: text.trim()  // 確保文本格式簡潔
        }),
        callLogLevel: "CALL_LOG_LEVEL_UNSPECIFIED"
      };
  
      console.log('發送到工作流的數據:', requestBody);
  
      const response = await axios.post(WORKFLOW_URL, requestBody, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.data?.name) {
        const executionName = response.data.name;
        let executionResult = null;
        const maxAttempts = 100;
        let attempts = 0;

        while (!executionResult && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));

          const statusResponse = await axios.get(
            `https://workflowexecutions.googleapis.com/v1/${executionName}`,
            {
              headers: { "Authorization": `Bearer ${token}` }
            }
          );
          
          if (statusResponse.data.state === "SUCCEEDED") {
            executionResult = statusResponse.data.result;
            break;
          } else if (statusResponse.data.state === "FAILED") {
            throw new Error(statusResponse.data.error?.message || 'Workflow failed');
          }
        }

        if (!executionResult) {
          throw new Error('Processing timeout');
        }

        setResult(JSON.parse(executionResult));
      } else {
        throw new Error('Invalid workflow response');
      }
    } catch (err) {
      console.error("Processing error:", err);
      setError(err.message || 'Processing failed');
      setResult(null);
      
      if (err.response?.status === 401) {
        refreshToken();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="absolute top-8 left-8">
          <div className="flex items-center space-x-4">
            <HandRaisedIcon className="h-10 w-10 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Sign Language Translator</h1>
              <p className="text-sm text-gray-600">Convert text or speech to sign language</p>
              {token && <p className="text-xs text-green-600">Connected</p>}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex min-h-screen pt-24">
          {/* Left Input Section */}
          <div className="w-1/2 p-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="space-y-6">
                <TextInput onSubmit={processText} disabled={loading || !token} />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or</span>
                  </div>
                </div>
                
                <AudioRecorder 
                  onRecordingComplete={handleRecordingComplete} 
                  disabled={loading || !token} 
                />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or</span>
                  </div>
                </div>
                
                <FileUploadButton 
                  disabled={loading || !token} 
                  onTranscriptionComplete={processText} 
                />
              </div>

              {/* Error Messages */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Animation */}
              {loading && (
                <div className="mt-6 flex justify-center">
                  <div className="relative">
                    <div className="w-12 h-12">
                      <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-indigo-200 animate-pulse"></div>
                      <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-3 text-sm text-gray-500">Translating...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Result Section */}
          <div className="w-1/2 p-8">
            {result && (
              <div className="transform transition-all duration-500 ease-in-out">
                <ResultDisplay result={result} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;