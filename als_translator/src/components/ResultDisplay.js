import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, PauseCircle, SkipForward, SkipBack, Volume2, RefreshCcw } from "lucide-react";

const VideoPlaylist = ({ videos }) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const videoRef = useRef(null);
  const nextVideoRef = useRef(null); // Reference for preloading next video

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex(prev => prev + 1);
      } else {
        setCurrentVideoIndex(0);
      }
    };

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress);

      // Preload next video when current video is near the end
      if (video.duration - video.currentTime < 0.5 && nextVideoRef.current) {
        nextVideoRef.current.load();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Preload the video when it becomes current
    video.load();

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [currentVideoIndex, videos.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoplay && isPlaying) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(error => {
          console.log('Autoplay prevented:', error);
        });
      }
    }
  }, [currentVideoIndex, autoplay, isPlaying]);

  // Preload next video
  useEffect(() => {
    const nextIndex = (currentVideoIndex + 1) % videos.length;
    if (nextVideoRef.current) {
      nextVideoRef.current.src = videos[nextIndex]?.video_url;
      nextVideoRef.current.load();
    }
  }, [currentVideoIndex, videos]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
    } else {
      setCurrentVideoIndex(videos.length - 1);
    }
  };

  const handleNext = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else {
      setCurrentVideoIndex(0);
    }
  };

  const toggleAutoplay = () => {
    setAutoplay(!autoplay);
  };

  return (
    <div className="max-w-fit mx-auto bg-white rounded-lg p-4" style={{ maxWidth: '350px' }}>
      <div className="relative w-auto">
        <video
          ref={videoRef}
          className="rounded-lg w-full"
          key={videos[currentVideoIndex]?.video_url}
          autoPlay={autoplay}
          playsInline
          preload="auto"
          onLoadedMetadata={() => {
            if (autoplay && isPlaying) {
              videoRef.current.play();
            }
          }}
        >
          <source src={videos[currentVideoIndex]?.video_url} type="video/mp4" />
          Your browser does not support video playback
        </video>
        
        {/* Hidden video element for preloading next video */}
        <video
          ref={nextVideoRef}
          style={{ display: 'none' }}
          preload="auto"
          playsInline
        >
          <source type="video/mp4" />
        </video>
        
        <div className="w-full bg-gray-200 h-1 mt-2 rounded">
          <div 
            className="bg-indigo-600 h-1 rounded transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAutoplay}
            className={`flex items-center space-x-1 px-2 py-1 rounded ${
              autoplay ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="text-xs">Loop</span>
          </button>
          <span className="text-sm text-gray-500">
            Sign {currentVideoIndex + 1} of {videos.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={handlePrevious}
            className="p-2 hover:text-indigo-600"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          
          <button 
            onClick={handlePlayPause}
            className="p-2 hover:text-indigo-600 transition-colors duration-200"
          >
            {isPlaying ? 
              <PauseCircle className="w-8 h-8" /> : 
              <PlayCircle className="w-8 h-8" />
            }
          </button>
          
          <button 
            onClick={handleNext}
            className="p-2 hover:text-indigo-600"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-gray-500" />
          <p className="text-sm text-gray-500">{videos[currentVideoIndex]?.gloss}</p>
        </div>
      </div>
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
  <div className="bg-white rounded-lg shadow-md p-4 mb-4">
    <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center">
      <span className={`w-1.5 h-1.5 bg-${indicator}-500 rounded-full mr-2`}></span>
      {title}
    </h3>
    {children}
  </div>
);

export function ResultDisplay({ result }) {
  if (!result || !Array.isArray(result)) return null;

  const successInfo = result.find(item => 'success' in item);
  const originalInput = result.find(item => 'original_input' in item)?.original_input;
  const glossResponse = result.find(item => 'gloss_response' in item)?.gloss_response;
  const videoResponse = result.find(item => 'video_response' in item)?.video_response;
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
            {(glossResponse?.original_text || originalInput?.text) && (
              <p className="text-gray-700">
                {glossResponse?.original_text || originalInput?.text}
              </p>
            )}
            
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

      {/* Video Playlist */}
      {videoResponse?.video_mappings && videoResponse.video_mappings.length > 0 && (
        <ResultCard 
        title={`Sign Language Videos (${videoResponse.total_clips} signs)`} 
        indicator="green"
        className="max-w-md" // Add this class to limit width
      >
          <VideoPlaylist videos={videoResponse.video_mappings} />
        </ResultCard>
      )}

      {/* Execution Info */}
      {executionInfo && (
        <div className="text-xs text-gray-400 mt-4">
          Processed at: {executionInfo[1]?.timestamp || videoResponse?.timestamp}
        </div>
      )}
    </div>
  );
}