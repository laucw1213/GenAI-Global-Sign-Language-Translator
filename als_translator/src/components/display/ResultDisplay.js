
import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, PauseCircle, SkipForward, SkipBack, RefreshCcw } from "lucide-react";

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
  
  // Check if video has URL
  const hasVideoUrl = (video) => {
    return video.video_url && video.video_url;
  };
  
  // Initialize and preload
  useEffect(() => {
    const preloadVideos = async () => {
      // Preload first 3 videos
      const preloadCount = Math.min(videoPoolSize, videos.length);
      for (let i = 0; i < preloadCount; i++) {
        const video = videoRefs.current[i].current;
        if (video && hasVideoUrl(videos[i])) {
          video.src = videos[i].video_url;
          // Set the background color of video
          video.style.backgroundColor = '#000';
          await video.load();
        }
      }
      
      // Start playing first video if autoplay is enabled and it's supported
      if (autoplay && videoRefs.current[0].current && hasVideoUrl(videos[0])) {
        try {
          await videoRefs.current[0].current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Autoplay failed:', error);
        }
      } else if (autoplay) {
        // If first video is unsupported, the index change effect will handle it
        console.log("First video is unsupported, will be handled by index change effect");
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
          nextVideo.src = videos[nextIndex].video_url;
          nextVideo.style.backgroundColor = '#000';
          nextVideo.load();
        }
      }
    };

    const handleEnded = async () => {
      // Only continue to next video if autoplay is enabled
      if (autoplay) {
        console.log(`Video ended at index=${currentVideoIndex}, moving to next`);
        // Simply call handleNext instead of duplicating logic
        handleNext();
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

  // Add debug effect to track state changes
  useEffect(() => {
    console.log(`Video state changed: index=${currentVideoIndex}, isPlaying=${isPlaying}, autoplay=${autoplay}`);
  }, [currentVideoIndex, isPlaying, autoplay]);
  
  // Add effect to handle videos when index changes
  useEffect(() => {
    // Check if current video is valid
    if (currentVideoIndex >= 0 && currentVideoIndex < videos.length) {
      const isCurrentSupported = hasVideoUrl(videos[currentVideoIndex]);
      
      if (isCurrentSupported) {
        // If video is supported and autoplay is on, play it
        if (autoplay) {
          console.log(`Current video at index=${currentVideoIndex} is supported, playing it`);
          const currentVideo = videoRefs.current[currentVideoIndex].current;
          if (currentVideo) {
            // Ensure video is loaded
            if (!currentVideo.src) {
              currentVideo.src = videos[currentVideoIndex].video_url;
              currentVideo.style.backgroundColor = '#000';
              currentVideo.load();
            }
            
            // Play video
            currentVideo.play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch(error => {
                console.error('Error playing video:', error);
              });
          }
        }
      } else if (autoplay) {
        // If video is unsupported and autoplay is on, wait 2 seconds then move to next video
        console.log(`Current video at index=${currentVideoIndex} is unsupported, will skip after delay`);
        
        const timeoutId = setTimeout(() => {
          console.log(`Delay complete for unsupported video at index=${currentVideoIndex}, moving to next`);
          // Calculate next index
          const nextIndex = (currentVideoIndex + 1) % videos.length;
          setCurrentVideoIndex(nextIndex);
        }, 2000);
        
        // Cleanup function
        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentVideoIndex, autoplay, videos]);

  const handleNext = () => {
    const nextIndex = (currentVideoIndex + 1) % videos.length;
    const isSupported = hasVideoUrl(videos[nextIndex]);
    
    console.log(`Moving to next video: index=${nextIndex}, isSupported=${isSupported}, gloss=${videos[nextIndex].gloss}`);
    
    // Simply update the current index - the index change effect will handle playback logic
    setCurrentVideoIndex(nextIndex);
  };

  const handlePrevious = () => {
    const prevIndex = currentVideoIndex > 0 ? currentVideoIndex - 1 : videos.length - 1;
    const isSupported = hasVideoUrl(videos[prevIndex]);
    
    console.log(`Moving to previous video: index=${prevIndex}, isSupported=${isSupported}, gloss=${videos[prevIndex].gloss}`);
    
    // Simply update the current index - the index change effect will handle playback logic
    setCurrentVideoIndex(prevIndex);
  };

  return (
    <div className="max-w-[400px] mx-auto bg-white rounded-lg p-4 shadow-lg">
      <div className="relative w-full" style={{ paddingBottom: '133.33%' }}>
        <div ref={containerRef} className="absolute inset-0 bg-black">
          {/* Video pool */}
          {videos.map((video, index) => {
            const isSupported = hasVideoUrl(video);
            
            return (
              <div
                key={index}
                className="absolute inset-0"
                style={{
                  visibility: currentVideoIndex === index ? 'visible' : 'hidden',
                  backgroundColor: '#000'
                }}
              >
                {isSupported ? (
                  <video
                    ref={videoRefs.current[index]}
                    className="rounded-lg w-full h-full object-contain bg-black"
                    playsInline
                    muted
                    preload="auto"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-4">
                      <div className="text-yellow-500 text-4xl mb-2">⚠️</div>
                      <div className="text-white text-lg font-bold">
                        {video.gloss}
                      </div>
                      <div className="text-gray-400 text-sm mt-2">
                        Unsupported sign
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-200 h-1">
            <div 
              className="bg-indigo-600 h-1"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top row with Loop, sign word, and counter */}
      <div className="flex items-center justify-between my-3">
        <button
          onClick={() => setAutoplay(!autoplay)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${
            autoplay ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
          }`}
        >
          <RefreshCcw className="w-4 h-4" />
          <span className="text-xs font-medium">Loop</span>
        </button>
        
        <span className="text-gray-600 text-base">
          {videos[currentVideoIndex].gloss}
        </span>
        
        <span className="text-sm text-gray-500 font-medium">
          Sign {currentVideoIndex + 1} of {videos.length}
        </span>
      </div>

      {/* Control buttons */}
      <div className="mt-2 space-y-4">

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

        {/* Original text at bottom */}
        <div className="text-center text-sm text-gray-600 mt-2">
          <p>{originalText}</p>
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
  if (!result) return null;

  // 提取字段
  const { original_input, videos } = result;
  
  // 获取原始文本
  const original_text = typeof original_input === 'object' ? original_input.text : original_input;

  if (result.error) {
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
    <div className="max-w-full mx-auto">
      {videos && videos.length > 0 && (
        <VideoPlaylist 
          videos={videos.map(v => v[0])} 
          originalText={original_text}
        />
      )}
    </div>
  );
}
