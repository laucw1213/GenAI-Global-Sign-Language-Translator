import React from 'react';

const VideoPlayer = ({ url }) => {
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [url]);

  return (
    <div className="relative w-full">
      <video
        ref={videoRef}
        controls
        className="w-full h-auto rounded-lg shadow-sm"
        key={url}
      >
        <source src={`${url}?t=${Date.now()}`} type="video/mp4" />
        Your browser does not support video playback
      </video>
    </div>
  );
};

const AudioPlayer = ({ audioPath }) => {
  const audioUrl = `https://storage.googleapis.com/genasl-audio-files/${audioPath}`;
  
  return (
    <div className="flex items-center space-x-2 mt-2">
      <audio
        controls
        className="h-8 w-48"
        preload="metadata"
      >
        <source src={audioUrl} type="audio/mpeg" />
        Your browser does not support audio playback
      </audio>
      <span className="text-xs text-gray-500 truncate">
        {audioPath.split('-').pop()}
      </span>
    </div>
  );
};

const ResultCard = ({ title, children, indicator = "indigo" }) => (
  <div className="bg-white rounded-lg shadow p-4 mb-4">
    <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center">
      <span className={`w-1.5 h-1.5 bg-${indicator}-500 rounded-full mr-2`}></span>
      {title}
    </h3>
    {children}
  </div>
);

export function ResultDisplay({ result }) {
  if (!result || !Array.isArray(result)) return null;

  // 從陣列中取得各個部分的資料
  const successInfo = result.find(item => 'success' in item);
  const originalInput = result.find(item => 'original_input' in item)?.original_input;
  const glossResponse = result.find(item => 'gloss_response' in item)?.gloss_response;
  const videoResponse = result.find(item => 'video_response' in item)?.video_response;
  const mergedVideo = result.find(item => 'merged_video' in item)?.merged_video;
  const executionInfo = result.find(item => 'execution_info' in item)?.execution_info;

  if (!successInfo?.success) {
    return (
      <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
        <h3 className="font-semibold mb-2">Processing Failed</h3>
        <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Original Input */}
      {(glossResponse?.original_text || originalInput?.text || originalInput?.audio_path) && (
        <ResultCard title="Original Input" indicator="indigo">
          <div>
            {/* 顯示識別出的文字或原始文字 */}
            {(glossResponse?.original_text || originalInput?.text) && (
              <p className="text-gray-700">
                {glossResponse?.original_text || originalInput?.text}
              </p>
            )}
            
            {/* 音頻播放器 */}
            {originalInput?.audio_path && (
              <AudioPlayer audioPath={originalInput.audio_path} />
            )}
          </div>
        </ResultCard>
      )}

      {/* ASL Gloss Conversion */}
      {glossResponse && (
        <ResultCard title="ASL Gloss Conversion" indicator="purple">
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              {glossResponse.gloss}
            </p>
            {glossResponse.word_count > 0 && (
              <p className="text-sm text-gray-500">
                Word count: {glossResponse.word_count}
              </p>
            )}
            {glossResponse.skipped_words?.length > 0 && (
              <div className="text-sm text-yellow-600">
                <p>Skipped words:</p>
                <ul className="list-disc list-inside">
                  {glossResponse.skipped_words.map((word, idx) => (
                    <li key={idx}>{word}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ResultCard>
      )}

      {/* Merged Video */}
      {mergedVideo?.merged_video_url && (
        <ResultCard title="Complete Sign Language Video" indicator="green">
          <VideoPlayer url={mergedVideo.merged_video_url} />
        </ResultCard>
      )}

      {/* Individual Video Clips */}
      {videoResponse?.video_mappings && videoResponse.video_mappings.length > 0 && (
        <ResultCard 
          title={`Individual Sign Language Clips (${videoResponse.total_clips} clips)`} 
          indicator="pink"
        >
          <div className="grid gap-4 mt-2">
            {videoResponse.video_mappings.map((mapping, index) => (
              <div 
                key={index} 
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    Sign for "{mapping.gloss}"
                  </h4>
                </div>
                <VideoPlayer url={mapping.video_url} />
              </div>
            ))}
          </div>
        </ResultCard>
      )}

      {/* Execution Info */}
      {executionInfo && (
        <div className="text-xs text-gray-400 mt-4">
          Processed at: {executionInfo[1]?.timestamp || videoResponse?.timestamp || mergedVideo?.timestamp}
        </div>
      )}
    </div>
  );
}