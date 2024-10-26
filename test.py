from pydub import AudioSegment
import wave

def get_audio_info(file_path):
    audio = AudioSegment.from_file(file_path)
    with wave.open(file_path, 'rb') as wf:
        return {
            "channels": wf.getnchannels(),
            "sample_width": wf.getsampwidth(),
            "frame_rate": wf.getframerate(),
            "frame_count": wf.getnframes(),
            "duration": wf.getnframes() / wf.getframerate(),
            "sample_rate": audio.frame_rate,
            "bit_depth": audio.sample_width * 8
        }

# 替换为你的音频文件路径
frontend_audio_info = get_audio_info("10e91aee-99e3-4f67-a581-3f730dfbe090-recording.wav")
frontend_audio_info2 = get_audio_info("614c53a1-4204-45f8-aee7-fcfd89006dd4-recording.wav")
windows_audio_info = get_audio_info("test.wav")

print("前端录音文件信息:", frontend_audio_info)
print("前端录音文件信息2:", frontend_audio_info2)
print("Windows 录音文件信息:", windows_audio_info)
