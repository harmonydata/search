"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import LinkPreviewCard from './LinkPreviewCard';

interface TextWithLinkPreviewsProps {
  text: string;
  compact?: boolean;
  paragraphProps?: React.ComponentProps<typeof Typography>;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function TextWithLinkPreviews({ 
  text, 
  compact = false,
  paragraphProps = {} 
}: TextWithLinkPreviewsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Set up intersection observer to detect when the component is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, no need to observe anymore
          if (containerRef.current) {
            observer.unobserve(containerRef.current);
          }
        }
      },
      {
        rootMargin: '100px', // Load a bit before it comes into view
        threshold: 0.1
      }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);
  
  // Parse the text to find URLs and split into segments
  const segments = useMemo(() => {
    if (!text) return [{ type: 'text', content: '' }];
    
    const parts = text.split(URL_REGEX);
    const matches = text.match(URL_REGEX) || [];
    
    // Interleave the parts and matches
    const result = [];
    for (let i = 0; i < parts.length; i++) {
      // Add the text part
      if (parts[i]) {
        result.push({ type: 'text', content: parts[i] });
      }
      
      // Add the URL match if there is one
      if (i < matches.length) {
        // Clean up the URL to ensure it ends properly (no trailing punctuation)
        let url = matches[i];
        
        // Remove trailing punctuation that might have been captured
        if (url.endsWith('.') || url.endsWith(',') || url.endsWith(';') || url.endsWith(':') || url.endsWith(')')) {
          url = url.slice(0, -1);
        }
        
        result.push({ type: 'url', content: url });
      }
    }
    
    return result;
  }, [text]);
  
  return (
    <Box 
      ref={containerRef}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <Typography 
              key={`text-${index}`} 
              variant="body1" 
              {...paragraphProps}
              sx={{ 
                ...paragraphProps.sx,
                whiteSpace: 'pre-wrap' 
              }}
            >
              {segment.content}
            </Typography>
          );
        } else {
          // Only render link previews if the component is visible
          return isVisible ? (
            <LinkPreviewCard 
              key={`url-${index}`} 
              url={segment.content} 
              compact={compact}
            />
          ) : (
            // Placeholder with just the URL until visible
            <Box 
              key={`url-placeholder-${index}`}
              component="a"
              href={segment.content}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              {segment.content}
            </Box>
          );
        }
      })}
    </Box>
  );
} 