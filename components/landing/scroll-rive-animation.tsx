"use client";

import React, { useEffect, useRef } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

interface ScrollRiveAnimationProps {
  src: string;
  stateMachineName: string;
  inputName?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function ScrollRiveAnimation({
  src,
  stateMachineName,
  inputName = 'scroll',
  className = '',
  style = {},
  children
}: ScrollRiveAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachineName,
    autoplay: true,
  }, {
    fitCanvasToArtboardHeight: true,
    useDevicePixelRatio: true,
  });

  // Get reference to your scroll input
  const scrollInput = useStateMachineInput(rive, stateMachineName, inputName);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollInput || !containerRef.current) return;

      // Get the container's position and dimensions
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerHeight = containerRect.height;
      const windowHeight = window.innerHeight;

      // Calculate scroll progress as percentage (0 to 100)
      // When the container enters the viewport, start the animation
      // When it's fully visible, complete the animation
      let scrollPercent = 0;
      
      if (containerTop <= windowHeight && containerTop + containerHeight >= 0) {
        // Container is in viewport
        const visibleTop = Math.max(0, -containerTop);
        const visibleHeight = Math.min(containerHeight, windowHeight - Math.max(0, containerTop));
        scrollPercent = (visibleTop / containerHeight) * 100;
        
        // Accelerate the animation - make it reach 100% when container is 70% scrolled
        const accelerationFactor = 1.4; // Higher = earlier activation
        scrollPercent = scrollPercent * accelerationFactor;
        
        // Clamp between 0 and 100
        scrollPercent = Math.max(0, Math.min(100, scrollPercent));
      } else if (containerTop < 0) {
        // Container is above viewport (scrolled past)
        scrollPercent = 100;
      }

      // Update the Rive state machine input
      scrollInput.value = scrollPercent;
    };

    // Add scroll event listener with passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial call to set the correct state
    handleScroll();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollInput]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
    >
      <RiveComponent 
        className="w-screen h-screen pointer-events-none"
      />
      {children}
    </div>
  );
}
