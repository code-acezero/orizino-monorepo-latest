"use client";
import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  zoomScale?: number;
}

/**
 * Image with hover-to-zoom (desktop) and pinch/double-tap zoom (mobile).
 * Shows a magnified view following the cursor on hover.
 */
const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  className = "",
  zoomScale = 2.5,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  }, []);

  const handleMouseEnter = useCallback(() => setZoomed(true), []);
  const handleMouseLeave = useCallback(() => setZoomed(false), []);

  // Double-tap zoom for mobile
  const lastTap = useRef(0);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      e.preventDefault();
      setZoomed(z => !z);
      // Center zoom on double-tap location
      if (containerRef.current && e.changedTouches[0]) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.changedTouches[0].clientX - rect.left) / rect.width) * 100;
        const y = ((e.changedTouches[0].clientY - rect.top) / rect.height) * 100;
        setOrigin({ x, y });
      }
    }
    lastTap.current = now;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!zoomed || !containerRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
    const y = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
    setOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  }, [zoomed]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden cursor-zoom-in ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <motion.img
        src={src}
        alt={alt}
        className="w-full h-full object-cover select-none"
        draggable={false}
        animate={{
          scale: zoomed ? zoomScale : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
      />
    </div>
  );
};

export default ZoomableImage;
