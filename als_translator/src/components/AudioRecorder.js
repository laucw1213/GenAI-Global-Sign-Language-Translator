import React, { useState, useRef } from "react";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

const HUGGING_FACE_TOKEN = "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";

export function AudioRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const audioContextRef = useRef(null);

  // Whisper API call
  const queryWhisperAPI = async (audioBlob) => {
    setProcessingStatus("Calling Whisper API...");
    try {
      // 確保音頻數據正確格式化
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      
      const response = await fetch(
        "https://api-inference.huggingface.co/models/openai/whisper-base",
        {
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_TOKEN}`
            // 移除 Content-Type，讓瀏覽器自動設置正確的 multipart/form-data
          },
          method: "POST",
          body: formData
        }
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
      }
  
      const result = await response.json();
      console.log('Whisper API response:', result); // 添加更詳細的日誌
      return result;
    } catch (error) {
      console.error("Whisper API detailed error:", error);
      throw error;
    }
  };

  const processAudioData = async (wavBlob) => {
    setIsProcessing(true);
    try {
      // First try Whisper API
      const whisperResult = await queryWhisperAPI(wavBlob);
      
      if (whisperResult && whisperResult.text) {
        setProcessingStatus("Transcription successful!");
        return {
          success: true,
          text: whisperResult.text,
          source: 'whisper'
        };
      }

      // Fallback to original upload process
      setProcessingStatus("Uploading to server...");
      const formData = new FormData();
      formData.append('file', wavBlob, 'recording.wav');

      const response = await fetch('https://asia-east1-genasl.cloudfunctions.net/upload-audio', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          file_path: result.file_path,
          source: 'upload'
        };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      if (permission.state === 'denied') {
        throw new Error('Microphone permission denied');
      }
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      return false;
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!(await checkMicrophonePermission())) {
      alert("Please allow microphone access to record audio");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          channelCount: 1,
          sampleRate: 16000
        }
      });

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      const chunks = [];

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(inputBuffer));
      };

      setMediaRecorder({
        stream,
        source,
        processor,
        audioContext: audioContextRef.current,
        chunks,
        stop: () => {
          processor.disconnect();
          source.disconnect();
          stream.getTracks().forEach(track => track.stop());

          const mergedData = mergeBuffers(chunks, chunks.length * 4096);
          const wavBlob = createWaveBlob(mergedData, audioContextRef.current.sampleRate);

          // Process the recorded audio
          processAudioData(wavBlob).then(result => {
            if (result.success) {
              onRecordingComplete(result);
            }
          }).catch(error => {
            console.error('Processing error:', error);
            alert('Error processing audio. Please try again.');
          });
        }
      });

      setIsRecording(true);

      // Automatically stop after 10 seconds
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 10000);

    } catch (err) {
      console.error("Recording error:", err);
      alert("Error starting recording: " + err.message);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Merge audio buffers
  const mergeBuffers = (buffers, length) => {
    const result = new Float32Array(length);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  };

  // Create WAV blob
  const createWaveBlob = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write audio data
    floatTo16BitPCM(view, 44, samples);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

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