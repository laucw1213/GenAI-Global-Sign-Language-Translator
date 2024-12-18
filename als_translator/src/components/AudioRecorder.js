// AudioRecorder.js
import React, { useState, useRef, useEffect } from "react";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";
import { processContent } from './apiServices';

const MAX_RECORDING_TIME = 10000; // 10 seconds

// iOS device detection regex
const IOS_REGEX = /iPhone|iPad|iPod/i;

export function AudioRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);

  const getMediaRecorderMimeType = () => {
    // Add more supported formats for iOS devices
    const types = [
      'audio/mp4',           // iOS priority
      'audio/aac',           // iOS supported
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp3',
      'audio/mpeg'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Using audio format:', type);
        return type;
      }
    }
    
    // Specific error message for iOS devices
    const isIOS = IOS_REGEX.test(navigator.userAgent);
    if (isIOS) {
      throw new Error('iOS devices may not support web recording. Please use the file upload feature instead.');
    }
    throw new Error('Browser does not support any available audio formats');
  };

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      // Friendly error message for iOS devices
      const isIOS = IOS_REGEX.test(navigator.userAgent);
      if (isIOS) {
        alert("iOS devices require microphone access in Settings. If recording doesn't work, please use the file upload feature.");
      } else {
        alert("Please allow microphone access to record audio");
      }
      return false;
    }
  };

  const startRecording = async () => {
    if (!(await checkMicrophonePermission())) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100, // Changed to more common sample rate
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mimeType = getMediaRecorderMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // Higher bitrate for better quality
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
          console.log('Recording complete, size:', audioBlob.size, 'type:', mimeType);
          
          setProcessingStatus("Processing audio...");
          const result = await processContent(audioBlob, 'audio');
          onRecordingComplete(result);
          
        } catch (error) {
          console.error('Audio processing error:', error);
          onRecordingComplete({ 
            success: false, 
            error: error.message || 'Audio processing error' 
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
      console.error("Recording error:", err);
      // Specific error message for iOS devices
      const isIOS = IOS_REGEX.test(navigator.userAgent);
      if (isIOS) {
        alert("iOS devices may not support web recording. Please use the file upload feature instead. Error: " + err.message);
      } else {
        alert("Unable to start recording: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearTimeout(recordingTimeoutRef.current);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
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
            Stop Recording
          </>
        ) : (
          <>
            <MicrophoneIcon className="h-5 w-5 mr-2" />
            Start Recording
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
