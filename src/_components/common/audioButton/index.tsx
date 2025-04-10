import { useEffect, useRef, useState } from "react";
import styles from "./style.module.css";

declare global {
  interface Window {
    isAudioEnabled: boolean;
  }
}

interface AudioControlButtonProps {
  initialPlayState?: boolean;
  onToggle?: (isPlaying: boolean) => void;
  loopAudioSrc?: string;
  uiSoundSrc?: string;
}

const AudioControlButton = ({ 
  initialPlayState = false, 
  onToggle,
  loopAudioSrc = "/audio/cosmic_drift.mp3", 
  uiSoundSrc = "/audio/ui.mp3"
}: AudioControlButtonProps) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(initialPlayState);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [wasPlayingBeforeHidden, setWasPlayingBeforeHidden] = useState(false);
  const [audioData, setAudioData] = useState<number[]>([0.2, 0.2, 0.2, 0.2]);
  
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const uiSoundRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    window.isAudioEnabled = isAudioPlaying;
    
    if (isAudioPlaying && audioElementRef.current && !audioContextRef.current) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32; 
        
        const sourceNode = audioContext.createMediaElementSource(audioElementRef.current);
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceNodeRef.current = sourceNode;
        
        startAudioVisualization();
      } catch (error) {
        console.error("Error setting up audio analysis:", error);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAudioPlaying]);

  const startAudioVisualization = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateVisualizer = () => {
      if (!analyserRef.current || !isAudioPlaying) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const numBars = 4;
      const sampleSize = Math.floor(dataArray.length / numBars);
      
      const newData = Array.from({ length: numBars }, (_, i) => {
        const startIndex = i * sampleSize;
        let sum = 0;
        for (let j = 0; j < sampleSize; j++) {
          sum += dataArray[startIndex + j] || 0;
        }
        const average = sum / sampleSize;
        return Math.max(0.2, Math.min(1, (average / 255) * 3));
      });
      
      setAudioData(newData);
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  };

  const playUISound = () => {
    if (!uiSoundRef.current || !window.isAudioEnabled) return;
    
    uiSoundRef.current.currentTime = 0;
    
    const playPromise = uiSoundRef.current.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setTimeout(() => {
          if (uiSoundRef.current) {
            uiSoundRef.current.pause();
            uiSoundRef.current.currentTime = 0;
          }
        }, 1000); // Stop after 1 second
      }).catch(error => {
        console.log("UI sound failed to play:", error);
      });
    }
  };

  const toggleAudioIndicator = () => {
    const newState = !isAudioPlaying;
    setIsAudioPlaying(newState);
    
    if (onToggle) {
      onToggle(newState);
    }
    
    if (!newState && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      setAudioData([0.2, 0.2, 0.2, 0.2]);
    } else if (newState) {
      startAudioVisualization();
    }
    
    playUISound();
  };

  useEffect(() => {
    const handleGlobalClick = async () => {
      if (!hasUserInteracted) {
        try {
          setHasUserInteracted(true);
          if (audioElementRef.current) {
            await audioElementRef.current.play();
          }
          setIsAudioPlaying(true);
          if (onToggle) {
            onToggle(true);
          }
        } catch (error) {
          console.log("Audio autoplay failed:", error);
        }
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [hasUserInteracted, onToggle]);

  useEffect(() => {
    const handleAudio = async () => {
      try {
        if (isAudioPlaying) {
          await audioElementRef.current?.play();
        } else {
          audioElementRef.current?.pause();
        }
      } catch (error) {
        console.log("Audio playback failed:", error);
        setIsAudioPlaying(false);
      }
    };
    handleAudio();
  }, [isAudioPlaying]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWasPlayingBeforeHidden(isAudioPlaying);
        if (isAudioPlaying) {
          audioElementRef.current?.pause();
          setIsAudioPlaying(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        }
      } else {
        if (wasPlayingBeforeHidden && hasUserInteracted) {
          audioElementRef.current?.play().catch(error => {
            console.log("Audio resume failed:", error);
          });
          setIsAudioPlaying(true);
          startAudioVisualization();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAudioPlaying, wasPlayingBeforeHidden, hasUserInteracted]);

  return (
    <button
      className={styles.audioButton}
      onClick={toggleAudioIndicator}
      aria-label={isAudioPlaying ? "Mute audio" : "Play audio"}
    >
      <audio
        ref={audioElementRef}
        className="hidden"
        src={loopAudioSrc}
        loop
        preload="auto"
      />
      <audio 
        ref={uiSoundRef}
        className="hidden"
        src={uiSoundSrc}
        preload="auto"
      />
      
      <div className={styles.linesContainer}>
        {audioData.map((value, index) => (
          <div
            key={index}
            className={styles.lineWrapper}
          >
            <div
              className={styles['indicator-line']}
              style={{ 
                transform: `scaleY(${value * 3})`, 
                transitionDuration: isAudioPlaying ? '0.05s' : '0.2s' 
              }}
            />
          </div>
        ))}
      </div>
    </button>
  );
};

export default AudioControlButton;