import React, { useState, useRef } from "react";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

const HUGGING_FACE_TOKEN = "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";
const MAX_RECORDING_TIME = 10000; // 10 seconds

export function AudioRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);

  const getMediaRecorderMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('使用音頻格式:', type);
        return type;
      }
    }
    
    throw new Error('瀏覽器不支持任何可用的音頻格式');
  };

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('麥克風權限錯誤:', error);
      return false;
    }
  };

  const startRecording = async () => {
    if (!(await checkMicrophonePermission())) {
      alert("請允許使用麥克風以進行錄音");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const mimeType = getMediaRecorderMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 16000
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setIsProcessing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('錄音完成，大小:', audioBlob.size, '類型:', mimeType);
      
          const arrayBuffer = await audioBlob.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
      
          setProcessingStatus("正在轉錄音頻...");
          
          // 添加任務參數來強制輸出英文
          const response = await fetch(
            "https://api-inference.huggingface.co/models/openai/whisper-base",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                inputs: Array.from(data),
                parameters: {
                  task: "translate",  // 使用翻譯任務
                  language: "en",     // 指定源語言檢測
                  return_timestamps: false
                }
              })
            }
          );
      
          if (!response.ok) {
            throw new Error(`API 錯誤: ${response.status}`);
          }
      
          const result = await response.json();
          console.log('API 返回結果:', result);
      
          onRecordingComplete({ 
            success: true, 
            text: result  
          });
      
        } catch (error) {
          console.error('音頻處理錯誤:', error);
          onRecordingComplete({ 
            success: false, 
            error: error.message || '音頻處理錯誤' 
          });
        } finally {
          setIsProcessing(false);
          setProcessingStatus("");
          audioChunksRef.current = [];
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);

      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, MAX_RECORDING_TIME);

    } catch (err) {
      console.error("錄音錯誤:", err);
      alert("無法啟動錄音: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearTimeout(recordingTimeoutRef.current);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      clearTimeout(recordingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`
          flex items-center px-6 py-3 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-offset-2
          transition-all duration-200 font-medium
          ${isRecording
            ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          transform hover:scale-105 active:scale-95
        `}
      >
        {isRecording ? (
          <>
            <StopIcon className="h-5 w-5 mr-2" />
            停止錄音
          </>
        ) : (
          <>
            <MicrophoneIcon className="h-5 w-5 mr-2" />
            開始錄音
          </>
        )}
      </button>
      
      {isProcessing && (
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <div className="text-sm text-gray-600">{processingStatus}</div>
        </div>
      )}
    </div>
  );
}