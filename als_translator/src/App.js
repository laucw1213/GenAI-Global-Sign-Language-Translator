import React, { useState, useEffect } from "react";
import { TextInput } from "./components/TextInput";
import { AudioRecorder } from "./components/AudioRecorder";
import { ResultDisplay } from "./components/ResultDisplay";
import axios from "axios";
import { HandRaisedIcon } from "@heroicons/react/24/outline";

const WORKFLOW_URL = "https://workflowexecutions.googleapis.com/v1/projects/genasl/locations/asia-east1/workflows/asl-translation/executions";
const AUTH_URL = "https://asia-east1-genasl.cloudfunctions.net/get-auth-token";

const FileUploadButton = ({ disabled, onFileUpload }) => {
  const fileInputRef = React.useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(0);
      const response = await fetch('https://asia-east1-genasl.cloudfunctions.net/upload-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('上傳失敗');
      }

      const data = await response.json();
      if (data.success) {
        setUploadProgress(100);
        onFileUpload(data.file_path);
      } else {
        throw new Error(data.error || '上傳失敗');
      }
    } catch (error) {
      console.error('上傳錯誤:', error);
      throw error;
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
        上傳音訊檔案
      </button>
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-2">
          <div className="bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      <p className="mt-2 text-sm text-gray-500 text-center">
        支援 WAV、MP3、M4A 等格式
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
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.token) {
        console.log('Token refreshed successfully');
        setToken(data.token);
        setLastTokenRefresh(Date.now());
        setError(null);
      } else {
        throw new Error(data.message || '無法獲取認證令牌');
      }
    } catch (err) {
      console.error("認證錯誤:", err);
      setError("認證失敗: " + (err.message || '未知錯誤'));
      setToken(null);
    }
  };

  useEffect(() => {
    refreshToken();
    
    const tokenRefreshInterval = setInterval(() => {
      refreshToken();
    }, 50 * 60 * 1000);

    return () => clearInterval(tokenRefreshInterval);
  }, []);

  const processText = async (text) => {
    if (!token) {
      setError("未完成認證，請稍後再試");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const requestBody = {
        argument: JSON.stringify({ text }),
        callLogLevel: "CALL_LOG_LEVEL_UNSPECIFIED"
      };

      console.log("發送請求: ", requestBody);

      const response = await axios.post(WORKFLOW_URL, requestBody, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.data && response.data.name) {
        const executionName = response.data.name;
        let executionResult = null;
        const maxAttempts = 10;
        let attempts = 0;

        while (!executionResult && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));

          const statusResponse = await axios.get(
            `https://workflowexecutions.googleapis.com/v1/${executionName}`,
            {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            }
          );
          
          console.log(`檢查執行狀態 ${attempts}/${maxAttempts}:`, statusResponse.data.state);
          
          if (statusResponse.data.state === "SUCCEEDED") {
            executionResult = statusResponse.data.result;
            break;
          } else if (statusResponse.data.state === "FAILED") {
            throw new Error(`工作流執行失敗: ${statusResponse.data.error?.message || '未知錯誤'}`);
          }
        }

        if (!executionResult) {
          throw new Error('工作流程執行超時');
        }

        setResult(JSON.parse(executionResult));
        setError(null);
      } else {
        throw new Error('伺服器返回格式不正確');
      }
    } catch (err) {
      console.error("處理錯誤:", err);
      setError(err.message || '處理請求時發生錯誤');
      setResult(null);
      
      if (err.response?.status === 401) {
        refreshToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const processAudio = async (audioPath) => {
    if (!token) {
      setError("未完成認證，請稍後再試");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const requestBody = {
        argument: JSON.stringify({
          audio_path: audioPath
        }),
        callLogLevel: "CALL_LOG_LEVEL_UNSPECIFIED"
      };

      console.log("發送請求: ", requestBody);

      const response = await axios.post(WORKFLOW_URL, requestBody, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.data && response.data.name) {
        const executionName = response.data.name;
        let executionResult = null;
        const maxAttempts = 10;
        let attempts = 0;

        while (!executionResult && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));

          const statusResponse = await axios.get(
            `https://workflowexecutions.googleapis.com/v1/${executionName}`,
            {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            }
          );
          
          console.log(`檢查執行狀態 ${attempts}/${maxAttempts}:`, statusResponse.data.state);
          
          if (statusResponse.data.state === "SUCCEEDED") {
            executionResult = statusResponse.data.result;
            break;
          } else if (statusResponse.data.state === "FAILED") {
            throw new Error(`工作流執行失敗: ${statusResponse.data.error?.message || '未知錯誤'}`);
          }
        }

        if (!executionResult) {
          throw new Error('工作流程執行超時');
        }

        setResult(JSON.parse(executionResult));
        setError(null);
      } else {
        throw new Error('伺服器返回格式不正確');
      }
    } catch (err) {
      console.error("處理錯誤:", err);
      setError(err.message || '處理請求時發生錯誤');
      setResult(null);
      
      if (err.response?.status === 401) {
        refreshToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecordingComplete = async (audioPath) => {
    try {
      await processAudio(audioPath);
    } catch (err) {
      setError(err.message || '處理音檔時發生錯誤');
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
              <h1 className="text-2xl font-bold text-gray-800">ASL Translator</h1>
              <p className="text-sm text-gray-600">將文字或語音轉換成美國手語</p>
              {token && <p className="text-xs text-green-600">已連接</p>}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex min-h-screen pt-24">
          {/* 左側輸入區 */}
          <div className="w-1/2 p-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="space-y-6">
                <TextInput onSubmit={processText} disabled={loading || !token} />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">或</span>
                  </div>
                </div>
                <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={loading || !token} />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">或</span>
                  </div>
                </div>
                <FileUploadButton disabled={loading || !token} onFileUpload={processAudio} />
              </div>

              {/* 錯誤訊息 */}
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

              {/* 載入動畫 */}
              {loading && (
                <div className="mt-6 flex justify-center">
                  <div className="relative">
                    <div className="w-12 h-12">
                      <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-indigo-200 animate-pulse"></div>
                      <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-3 text-sm text-gray-500">翻譯中...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右側結果區 */}
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
