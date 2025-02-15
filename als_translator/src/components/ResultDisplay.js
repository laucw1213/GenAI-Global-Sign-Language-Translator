
import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, PauseCircle, SkipForward, SkipBack, Volume2, RefreshCcw } from "lucide-react";

const VideoPlaylist = ({ videos, originalText }) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Video references array
  const videoRefs = useRef(videos.map(() => React.createRef()));
  const videoPoolSize = 3; // Preload pool size
  const containerRef = useRef(null);
  
  // Initialize and preload
  useEffect(() => {
    const preloadVideos = async () => {
      // Preload first 3 videos
      const preloadCount = Math.min(videoPoolSize, videos.length);
      for (let i = 0; i < preloadCount; i++) {
        const video = videoRefs.current[i].current;
        if (video) {
          video.src = videos[i].mapValue.fields.video_url.stringValue;
          // Set the background color of video
          video.style.backgroundColor = '#000';
          await video.load();
        }
      }
      
      // Start playing first video if autoplay is enabled
      if (autoplay && videoRefs.current[0].current) {
        try {
          await videoRefs.current[0].current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Autoplay failed:', error);
        }
      }
    };

    preloadVideos();

    // Set container background
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = '#000';
    }
  }, [videos, autoplay]);

  // Video event handlers
  useEffect(() => {
    const currentVideo = videoRefs.current[currentVideoIndex].current;
    if (!currentVideo) return;

    // Set initial playback speed
    currentVideo.playbackRate = playbackSpeed;

    const handleTimeUpdate = () => {
      // Update progress
      const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
      setProgress(progress);

      // Preload next video earlier, at 30%
      if (progress >= 30 && autoplay) {
        const nextIndex = (currentVideoIndex + 1) % videos.length;
        const nextVideo = videoRefs.current[nextIndex].current;
        if (nextVideo && !nextVideo.src) {
          nextVideo.src = videos[nextIndex].mapValue.fields.video_url.stringValue;
          nextVideo.style.backgroundColor = '#000';
          nextVideo.load();
        }
      }
    };

    const handleEnded = async () => {
      // Only continue to next video if autoplay is enabled
      if (autoplay) {
        const nextIndex = (currentVideoIndex + 1) % videos.length;
        const nextVideo = videoRefs.current[nextIndex].current;
        
        if (nextVideo) {
          // Ensure next video is loaded and ready
          if (!nextVideo.src) {
            nextVideo.src = videos[nextIndex].mapValue.fields.video_url.stringValue;
            nextVideo.style.backgroundColor = '#000';
            await nextVideo.load();
          }
          
          // Wait for video to be ready
          if (nextVideo.readyState < 3) {
            await new Promise(resolve => {
              nextVideo.addEventListener('canplay', resolve, { once: true });
            });
          }
          
          try {
            // Start playing next video immediately
            await nextVideo.play();
            nextVideo.playbackRate = playbackSpeed; // Set playback speed for next video
            setCurrentVideoIndex(nextIndex);
            
            // Preload next video in sequence
            const preloadIndex = (nextIndex + 1) % videos.length;
            const preloadVideo = videoRefs.current[preloadIndex].current;
            if (preloadVideo && !preloadVideo.src) {
              preloadVideo.src = videos[preloadIndex].mapValue.fields.video_url.stringValue;
              preloadVideo.style.backgroundColor = '#000';
              preloadVideo.load();
            }
          } catch (error) {
            console.error('Error playing next video:', error);
          }
        }
      } else {
        // Stop playing when current video ends if autoplay is disabled
        setIsPlaying(false);
      }
    };

    currentVideo.addEventListener('timeupdate', handleTimeUpdate);
    currentVideo.addEventListener('ended', handleEnded);

    return () => {
      currentVideo.removeEventListener('timeupdate', handleTimeUpdate);
      currentVideo.removeEventListener('ended', handleEnded);
    };
  }, [currentVideoIndex, videos.length, autoplay, playbackSpeed]);

  // Playback control functions
  const handlePlayPause = async () => {
    const currentVideo = videoRefs.current[currentVideoIndex].current;
    if (!currentVideo) return;

    try {
      if (isPlaying) {
        currentVideo.pause();
      } else {
        await currentVideo.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Play/Pause error:', error);
    }
  };

  const handleNext = async () => {
    const nextIndex = (currentVideoIndex + 1) % videos.length;
    const nextVideo = videoRefs.current[nextIndex].current;
    
    if (nextVideo) {
      if (!nextVideo.src) {
        nextVideo.src = videos[nextIndex].mapValue.fields.video_url.stringValue;
        nextVideo.style.backgroundColor = '#000';
        await nextVideo.load();
      }

      // Wait for video to be ready
      if (nextVideo.readyState < 3) {
        await new Promise(resolve => {
          nextVideo.addEventListener('canplay', resolve, { once: true });
        });
      }
      
      try {
        await nextVideo.play();
        nextVideo.playbackRate = playbackSpeed; // Set playback speed for next video
        setCurrentVideoIndex(nextIndex);
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing next video:', error);
      }
    }
  };

  const handlePrevious = async () => {
    const prevIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : videos.length - 1;
    const prevVideo = videoRefs.current[prevIndex].current;
    
    if (prevVideo) {
      if (!prevVideo.src) {
        prevVideo.src = videos[prevIndex].mapValue.fields.video_url.stringValue;
        prevVideo.style.backgroundColor = '#000';
        await prevVideo.load();
      }

      // Wait for video to be ready
      if (prevVideo.readyState < 3) {
        await new Promise(resolve => {
          prevVideo.addEventListener('canplay', resolve, { once: true });
        });
      }
      
      try {
        await prevVideo.play();
        prevVideo.playbackRate = playbackSpeed; // Set playback speed for previous video
        setCurrentVideoIndex(prevIndex);
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing previous video:', error);
      }
    }
  };

  return (
    <div className="max-w-[400px] mx-auto bg-white rounded-lg p-4 shadow-lg">
      <div className="relative w-full" style={{ paddingBottom: '133.33%' }}>
        <div ref={containerRef} className="absolute inset-0 bg-black">
          {/* Video pool */}
          {videos.map((_, index) => (
            <div
              key={index}
              className="absolute inset-0"
              style={{
                visibility: currentVideoIndex === index ? 'visible' : 'hidden',
                backgroundColor: '#000'
              }}
            >
              <video
                ref={videoRefs.current[index]}
                className="rounded-lg w-full h-full object-contain bg-black"
                playsInline
                muted
                preload="auto"
              />
            </div>
          ))}
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-200 h-1">
            <div 
              className="bg-indigo-600 h-1"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setAutoplay(!autoplay)}
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

        {/* Speed control buttons */}
        <div className="flex items-center justify-center space-x-2">
          {[0.1, 0.2, 0.5, 1].map((speed) => (
            <button
              key={speed}
              onClick={() => {
                setPlaybackSpeed(speed);
                const currentVideo = videoRefs.current[currentVideoIndex].current;
                if (currentVideo) {
                  currentVideo.playbackRate = speed;
                }
              }}
              className={`px-2 py-1 text-xs rounded ${
                playbackSpeed === speed
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-4">
          <button 
            onClick={handlePrevious}
            className="p-2 hover:text-indigo-600 transition-colors duration-200"
          >
            <SkipBack className="w-8 h-8 md:w-6 md:h-6" />
          </button>
          
          <button 
            onClick={handlePlayPause}
            className="p-2 hover:text-indigo-600 transition-colors duration-200"
          >
            {isPlaying ? 
              <PauseCircle className="w-12 h-12 md:w-8 md:h-8" /> : 
              <PlayCircle className="w-12 h-12 md:w-8 md:h-8" />
            }
          </button>
          
          <button 
            onClick={handleNext}
            className="p-2 hover:text-indigo-600 transition-colors duration-200"
          >
            <SkipForward className="w-8 h-8 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 px-2">
          <Volume2 className="w-4 h-4" />
          <p className="ml-2 truncate">{originalText}</p>
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

  const originalText = glossResponse?.original_text || originalInput?.text;

  return (
    <div className="space-y-4 max-w-full mx-auto">
      {(originalText || originalInput?.audio_path) && (
        <ResultCard title="Original Input" indicator="indigo">
          <div>
            {originalText && (
              <p className="text-gray-700 break-words">
                {originalText}
              </p>
            )}
            
            {originalInput?.audio_path && (
              <AudioPlayer audioPath={originalInput.audio_path} />
            )}
          </div>
        </ResultCard>
      )}

      {videoResponse?.mappings && videoResponse.mappings.length > 0 && (
        <ResultCard 
          title={`Sign Language Videos (${videoResponse.total_mappings} signs)`} 
          indicator="green"
        >
          <VideoPlaylist 
            videos={videoResponse.mappings.map(video => Array.isArray(video) ? video[0] : video)} 
            originalText={originalText}
          />
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
