import React, { useState, useEffect } from "react";
import useAuth from "./services/gcp/auth";
import useWorkflow from "./services/gcp/workflow";
import { TextInput } from "./components/input/TextInput";
import { AudioRecorder } from "./components/input/AudioRecorder";
import { ResultDisplay } from "./components/display/ResultDisplay";
import { UploadFile } from "./components/input/UploadFile";
import { HandRaisedIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

function App() {
  const [showResults, setShowResults] = useState(false);
  const { token, error: authError, refreshToken } = useAuth();
  const { loading, result, error, processText } = useWorkflow(token, refreshToken);

  useEffect(() => {
    if (result) {
      // On mobile, automatically show results when they arrive
      if (window.innerWidth < 768) {
        setShowResults(true);
      }
    }
  }, [result]);

  const handleRecordingComplete = async (text) => {
    if (!text) {
      return;
    }
    await processText(String(text).trim());
  };

  const toggleResults = () => {
    setShowResults(!showResults);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Header - Fixed for mobile, absolute for desktop */}
      <header className="fixed md:absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none z-10" style={{ padding: '2vw 7vw' }}>
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
      </header>

      {/* Main Content */}
      <div style={{ padding: '2vw 7vw', paddingTop: 'calc(2vw + 80px)' }}>
        <div className="flex flex-col md:flex-row md:space-x-[4vw] space-y-8 md:space-y-0">
          {/* Input Section - Full width on mobile, 41vw on desktop */}
          <div className={`w-full md:w-[41vw] transition-all duration-300 ${showResults ? 'hidden md:block' : 'block'}`}>
            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6">
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
              {(error || authError) && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error || authError}</p>
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

          {/* Result Section - Full width on mobile, 41vw on desktop */}
          <div className={`w-full md:w-[41vw] transition-all duration-300 ${!showResults ? 'hidden md:block' : 'block'}`}>
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
