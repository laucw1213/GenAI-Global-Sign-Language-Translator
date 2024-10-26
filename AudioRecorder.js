import React, { useState } from "react";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

export function AudioRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // 检查麦克风权限
  const checkMicrophonePermission = async () => {
    const permission = await navigator.permissions.query({ name: 'microphone' });
    if (permission.state !== 'granted') {
      alert("请允许访问麦克风以进行录音");
      return false;
    }
    return true;
  };

  // 开始录音
  const startRecording = async () => {
    if (!(await checkMicrophonePermission())) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 2 } // 设置为立体声通道
      });
      const audioContext = new AudioContext({ sampleRate: 44100 }); // 设置采样率为 44100 Hz
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 2, 2);
      const chunks = [];

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        const resampledBuffer = resampleAudio(inputBuffer, audioContext.sampleRate, 44100); // 重采样到44100 Hz
        chunks.push(new Float32Array(resampledBuffer));
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

          const mergedData = mergeBuffers(chunks, chunks.length * 4096);
          const wavBlob = createWaveBlob(mergedData, audioContext.sampleRate);

          uploadAudio(wavBlob);
        }
      });

      setIsRecording(true);

      // 设置录音时长为 4 秒
      setTimeout(() => {
        stopRecording();
      }, 4000);

    } catch (err) {
      console.error("无法访问麦克风:", err);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // 重采样函数，将音频数据重采样到目标采样率
  function resampleAudio(buffer, originalSampleRate, targetSampleRate) {
    if (originalSampleRate === targetSampleRate) {
      return buffer;
    }
    const sampleRateRatio = targetSampleRate / originalSampleRate;
    const newLength = Math.round(buffer.length * sampleRateRatio);
    const resampledBuffer = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i / sampleRateRatio;
      const previousIndex = Math.floor(sourceIndex);
      const nextIndex = Math.min(Math.ceil(sourceIndex), buffer.length - 1);
      const interpolation = sourceIndex - previousIndex;
      resampledBuffer[i] = buffer[previousIndex] * (1 - interpolation) + buffer[nextIndex] * interpolation;
    }
    return resampledBuffer;
  }

  // 合并音频数据
  const mergeBuffers = (buffers, length) => {
    const result = new Float32Array(length);
    let offset = 0;
    for (let i = 0; i < buffers.length; i++) {
      result.set(buffers[i], offset);
      offset += buffers[i].length;
    }
    console.log("Merged data length:", result.length); // 检查合并后数据长度
    return result;
  };

  // 创建 WAV 文件
  const createWaveBlob = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true); // 设置为立体声通道
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true); // 两个通道，每个样本2字节
    view.setUint16(32, 4, true); // 每帧字节数
    view.setUint16(34, 16, true); // 位深度
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    console.log("WAV Blob created with size:", buffer.byteLength); // 检查WAV文件大小
    return new Blob([buffer], { type: 'audio/wav' });
  };

  // 写入字符串到 DataView
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // 将浮点数数据转换为 16-bit PCM
  const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  // 上传 WAV 文件
  const uploadAudio = (wavBlob) => {
    const formData = new FormData();
    formData.append('file', wavBlob, 'recording.wav');

    fetch('https://asia-east1-genasl.cloudfunctions.net/upload-audio', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(result => {
      console.log("Upload result:", result);
      if (result.success) {
        onRecordingComplete(result.file_path);
      } else {
        throw new Error(result.error || '上传失败');
      }
    })
    .catch(error => {
      console.error('录音处理错误:', error);
    });
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
            停止录音
          </>
        ) : (
          <>
            <MicrophoneIcon className="h-5 w-5 mr-2" />
            开始录音
          </>
        )}
      </button>
    </div>
  );
}
