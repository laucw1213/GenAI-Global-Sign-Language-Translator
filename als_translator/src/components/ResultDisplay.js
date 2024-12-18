import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, PauseCircle, SkipForward, SkipBack, Volume2, RefreshCcw } from "lucide-react";

const VideoPlaylist = ({ videos }) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [activeVideo, setActiveVideo] = useState('primary');
  
  const primaryVideoRef = useRef(null);
  const secondaryVideoRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  // Preload all videos
  useEffect(() => {
    videos.forEach(video => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = video.video_url;
      document.head.appendChild(link);
    });

    // Initialize first video
    if (primaryVideoRef.current) {
      primaryVideoRef.current.src = videos[0].video_url;
      primaryVideoRef.current.load();
    }
  }, [videos]);

  const getCurrentVideo = () => {
    return activeVideo === 'primary' ? primaryVideoRef.current : secondaryVideoRef.current;
  };

  const getInactiveVideo = () => {
    return activeVideo === 'primary' ? secondaryVideoRef.current : primaryVideoRef.current;
  };

  const switchToNextVideo = async () => {
    const nextIndex = (currentVideoIndex + 1) % videos.length;
    const inactiveVideo = getInactiveVideo();
    
    // Prepare the inactive video
    inactiveVideo.src = videos[nextIndex].video_url;
    await inactiveVideo.load();
    
    // Start playing the next video slightly before switching
    const playPromise = inactiveVideo.play();
    if (playPromise) {
      await playPromise.catch(() => {});
    }

    // Switch videos
    setCurrentVideoIndex(nextIndex);
    setActiveVideo(activeVideo === 'primary' ? 'secondary' : 'primary');
  };

  useEffect(() => {
    const currentVideo = getCurrentVideo();
    const inactiveVideo = getInactiveVideo();
    
    if (!currentVideo) return;

    const handleTimeUpdate = () => {
      const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
      setProgress(progress);

      // Preload next video when current video is 80% complete
      if (progress > 80) {
        const nextIndex = (currentVideoIndex + 1) % videos.length;
        inactiveVideo.src = videos[nextIndex].video_url;
        inactiveVideo.load();
      }
    };

    const handleEnded = async () => {
      if (currentVideoIndex < videos.length - 1 || autoplay) {
        await switchToNextVideo();
      } else {
        setIsPlaying(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    currentVideo.addEventListener('timeupdate', handleTimeUpdate);
    currentVideo.addEventListener('ended', handleEnded);
    currentVideo.addEventListener('play', handlePlay);
    currentVideo.addEventListener('pause', handlePause);

    return () => {
      currentVideo.removeEventListener('timeupdate', handleTimeUpdate);
      currentVideo.removeEventListener('ended', handleEnded);
      currentVideo.removeEventListener('play', handlePlay);
      currentVideo.removeEventListener('pause', handlePause);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentVideoIndex, videos.length, autoplay, activeVideo]);

  useEffect(() => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    if (autoplay && isPlaying) {
      const playPromise = currentVideo.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    }
  }, [currentVideoIndex, autoplay, isPlaying, activeVideo]);

  const handlePlayPause = () => {
    const currentVideo = getCurrentVideo();
    if (currentVideo) {
      if (isPlaying) {
        currentVideo.pause();
      } else {
        currentVideo.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevious = async () => {
    const prevIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : videos.length - 1;
    const inactiveVideo = getInactiveVideo();
    
    inactiveVideo.src = videos[prevIndex].video_url;
    await inactiveVideo.load();
    
    const playPromise = inactiveVideo.play();
    if (playPromise) {
      await playPromise.catch(() => {});
    }

    setCurrentVideoIndex(prevIndex);
    setActiveVideo(activeVideo === 'primary' ? 'secondary' : 'primary');
  };

  const handleNext = async () => {
    await switchToNextVideo();
  };

  const toggleAutoplay = () => setAutoplay(!autoplay);

  return (
    <div className="max-w-[400px] mx-auto bg-white rounded-lg p-4 shadow-lg">
      <div className="relative w-full" style={{ paddingBottom: '133.33%' }}>
        <div className="absolute inset-0">
          <div className="relative w-full h-full">
            <div className={`absolute inset-0 transition-opacity duration-300 ${activeVideo === 'primary' ? 'opacity-100' : 'opacity-0'}`}>
              <video
                ref={primaryVideoRef}
                className="rounded-lg w-full h-full object-contain bg-black"
                playsInline
                preload="auto"
              >
                <source type="video/mp4" />
              </video>
            </div>
            <div className={`absolute inset-0 transition-opacity duration-300 ${activeVideo === 'secondary' ? 'opacity-100' : 'opacity-0'}`}>
              <video
                ref={secondaryVideoRef}
                className="rounded-lg w-full h-full object-contain bg-black"
                playsInline
                preload="auto"
              >
                <source type="video/mp4" />
              </video>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 bg-gray-200 h-1">
            <div 
              className="bg-indigo-600 h-1 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={toggleAutoplay}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${
              autoplay ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="text-xs font-medium">Loop</span>
          </button>
          
          <span className="text-sm text-gray-500 font-medium">
            Sign {currentVideoIndex + 1} of {videos.length}
          </span>
        </div>

        <div className="flex items-center justify-between px-4">
          <button 
            onClick={handlePrevious}
            className="p-2 hover:text-indigo-600 transition-colors duration-200 touch-manipulation"
          >
            <SkipBack className="w-8 h-8 md:w-6 md:h-6" />
          </button>
          
          <button 
            onClick={handlePlayPause}
            className="p-2 hover:text-indigo-600 transition-colors duration-200 touch-manipulation"
          >
            {isPlaying ? 
              <PauseCircle className="w-12 h-12 md:w-8 md:h-8" /> : 
              <PlayCircle className="w-12 h-12 md:w-8 md:h-8" />
            }
          </button>
          
          <button 
            onClick={handleNext}
            className="p-2 hover:text-indigo-600 transition-colors duration-200 touch-manipulation"
          >
            <SkipForward className="w-8 h-8 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 px-2">
          <Volume2 className="w-4 h-4" />
          <p className="ml-2 truncate">{videos[currentVideoIndex]?.gloss}</p>
        </div>
      </div>
    </div>
  );
};

const AudioPlayer = ({ audioPath }) => {
  const audioUrl = `https://storage.googleapis.com/genasl-audio-files/${audioPath}`;
  
  return (
    <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 mt-2">
      <audio
        controls
        className="w-full md:w-48 h-10"
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
    <div className="space-y-4 max-w-full mx-auto">
      {(glossResponse?.original_text || originalInput?.text || originalInput?.audio_path) && (
        <ResultCard title="Original Input" indicator="indigo">
          <div>
            {(glossResponse?.original_text || originalInput?.text) && (
              <p className="text-gray-700 break-words">
                {glossResponse?.original_text || originalInput?.text}
              </p>
            )}
            
            {originalInput?.audio_path && (
              <AudioPlayer audioPath={originalInput.audio_path} />
            )}
          </div>
        </ResultCard>
      )}

      {glossResponse && (
        <ResultCard title="ASL Gloss Conversion" indicator="purple">
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900 break-words">
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
                    <li key={idx} className="truncate">{word}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ResultCard>
      )}

      {videoResponse?.video_mappings && videoResponse.video_mappings.length > 0 && (
        <ResultCard 
          title={`Sign Language Videos (${videoResponse.total_clips} signs)`} 
          indicator="green"
        >
          <VideoPlaylist videos={videoResponse.video_mappings} />
        </ResultCard>
      )}

      {executionInfo && (
        <div className="text-xs text-gray-400 mt-4 text-center">
          Processed at: {executionInfo[1]?.timestamp || videoResponse?.timestamp}
        </div>
      )}
    </div>
  );
}
