import React, { useState, useEffect } from "react";
import { TextInput } from "./components/TextInput";
import { AudioRecorder } from "./components/AudioRecorder";
import { ResultDisplay } from "./components/ResultDisplay";
import { UploadFile } from "./components/UploadFile";
import { HandRaisedIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import axios from "axios";

const WORKFLOW_URL = "https://workflowexecutions.googleapis.com/v1/projects/genasl/locations/asia-east1/workflows/asl-translation/executions";
const AUTH_URL = "https://asia-east1-genasl.cloudfunctions.net/get-auth-token";

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState(0);
  const [showResults, setShowResults] = useState(false);

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

  useEffect(() => {
    if (result) {
      // On mobile, automatically show results when they arrive
      if (window.innerWidth < 768) {
        setShowResults(true);
      }
    }
  }, [result]);

  const handleRecordingComplete = async (result) => {
    if (!result || (!result.text && !result.success)) {
      setError('Could not get transcription result');
      return;
    }
  
    try {
      let text = '';
      if (result.success && typeof result.text === 'object') {
        text = JSON.stringify(result.text);
      } else if (result.success) {
        text = String(result.text).trim();
      } else if (typeof result === 'object') {
        text = result.text || JSON.stringify(result);
      } else {
        text = String(result).trim();
      }
  
      const textForProcess = text.replace(/['"{}[\]]/g, '').trim();
      await processText(textForProcess);
    } catch (error) {
      console.error('Processing recording error:', error);
      setError(error.message || 'Error processing recording result');
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
      
      const requestBody = {
        argument: JSON.stringify({ 
          text: text.trim()
        }),
        callLogLevel: "CALL_LOG_LEVEL_UNSPECIFIED"
      };
  
      console.log('Sending to workflow:', requestBody);
  
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

  const toggleResults = () => {
    setShowResults(!showResults);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Header - Fixed for mobile, absolute for desktop */}
      <header className="fixed md:absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none z-10 p-4 md:p-8">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <HandRaisedIcon className="h-8 w-8 md:h-10 md:w-10 text-indigo-600" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Sign Language Translator</h1>
                <p className="text-xs md:text-sm text-gray-600">Convert text or speech to sign language</p>
                {token && <p className="text-xs text-green-600">Connected</p>}
              </div>
            </div>
            
            {/* Mobile Toggle Button */}
            {result && (
              <button
                onClick={toggleResults}
                className="md:hidden rounded-full p-2 bg-indigo-600 text-white shadow-lg"
              >
                {showResults ? <ArrowUpIcon className="h-6 w-6" /> : <ArrowDownIcon className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-24 md:pt-32 pb-8">
        <div className="flex flex-col md:flex-row md:space-x-8 space-y-8 md:space-y-0">
          {/* Input Section - Full width on mobile, half on desktop */}
          <div className={`w-full md:w-1/2 transition-all duration-300 ${showResults ? 'hidden md:block' : 'block'}`}>
            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
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
                
                <UploadFile 
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

          {/* Result Section - Full width on mobile, half on desktop */}
          <div className={`w-full md:w-1/2 transition-all duration-300 ${!showResults ? 'hidden md:block' : 'block'}`}>
            {result && (
              <div className="transform transition-all duration-500 ease-in-out">
                <ResultDisplay result={result} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Back to Input Button */}
      {showResults && (
        <button
          onClick={toggleResults}
          className="fixed md:hidden bottom-6 right-6 rounded-full p-4 bg-indigo-600 text-white shadow-lg"
        >
          <ArrowUpIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

export default App;
