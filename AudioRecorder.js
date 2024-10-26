import React, { useState } from "react";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

export function AudioRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 1,
          sampleRate: 44100,
          sampleSize: 16
        } 
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const chunks = [];

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(data));
      };

      setMediaRecorder({
        stream,
        source,
        processor,
        audioContext,
        chunks,
        stop: () => {
          processor.disconnect();
          source.disconnect();
          stream.getTracks().forEach(track => track.stop());

          // Convert to WAV
          const mergedData = mergeBuffers(chunks, chunks.length * 4096);
          const wavBlob = createWaveBlob(mergedData, audioContext.sampleRate);

          // Upload WAV file
          const formData = new FormData();
          formData.append('file', wavBlob, 'recording.wav');

          fetch('https://asia-east1-genasl.cloudfunctions.net/upload-audio', {
            method: 'POST',
            body: formData
          })
          .then(response => response.json())
          .then(result => {
            if (result.success) {
              onRecordingComplete(result.file_path);
            } else {
              throw new Error(result.error || '上傳失敗');
            }
          })
          .catch(error => {
            console.error('錄音處理錯誤:', error);
            throw error;
          });
        }
      });
      
      setIsRecording(true);
    } catch (err) {
      console.error("麥克風錯誤:", err);
      throw new Error("無法存取麥克風");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // WAV 轉換函數
  const mergeBuffers = (buffers, length) => {
    const result = new Float32Array(length);
    let offset = 0;
    for (let i = 0; i < buffers.length; i++) {
      result.set(buffers[i], offset);
      offset += buffers[i].length;
    }
    return result;
  };

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

    // Write PCM data
    const floatTo16BitPCM = (output, offset, input) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    };
    floatTo16BitPCM(view, 44, samples);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  return (
    <div className="flex justify-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
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
    </div>
  );
}
