import React, { useRef, useEffect } from 'react';

interface HackerTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  charSet?: string;
  speed?: number;
  increment?: number;
}

const HackerText: React.FC<HackerTextProps> = ({
  text,
  className = '',
  style = {},
  charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  speed = 30,
  increment = 1/3
}) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleMouseOver = () => {
    if (!textRef.current) return;
    
    let iteration = 0;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (!textRef.current) return;
      
      textRef.current.innerText = text
        .split("")
        .map((letter, index) => {
          if (index < Math.floor(iteration)) {
            return text[index];
          }
          
          if (letter.match(/[a-z]/)) {
            return charSet.toLowerCase()[Math.floor(Math.random() * charSet.length)];
          } else if (letter.match(/[A-Z]/)) {
            return charSet[Math.floor(Math.random() * charSet.length)];
          } else if (letter.match(/[0-9]/)) {
            return "0123456789"[Math.floor(Math.random() * 10)];
          } else {
            return letter;
          }
        })
        .join("");
      
      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      
      iteration += increment;
    }, speed);
  };
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <span
      ref={textRef}
      className={className}
      style={{
        cursor: 'pointer',
        ...style
      }}
      onMouseOver={handleMouseOver}
      data-value={text}
    >
      {text}
    </span>
  );
};

export default HackerText;