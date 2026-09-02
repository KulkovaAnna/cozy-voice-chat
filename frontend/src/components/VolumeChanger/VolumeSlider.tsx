import { useRef, useState, useCallback, useEffect } from "react";
import { SliderContainer, Track, Thumb } from "./VolumeSlider.styles";

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  height: number;
  className?: string;
  thumbSize?: number;
}

const MIN = 0,
  MAX = 1,
  STEP = 0.1;

export function VolumeSlider(props: VolumeSliderProps) {
  const { onChange, value, className, height, thumbSize = 24 } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateThumbTop = useCallback(
    (val: number) => {
      const containerHeight = containerRef.current?.clientHeight || height;
      const trackHeight = containerHeight - thumbSize;
      const progress = 1 - (val - MIN) / (MAX - MIN);
      return thumbSize / 2 + progress * trackHeight;
    },
    [height, thumbSize],
  );

  const getValueFromPosition = useCallback(
    (clientY: number) => {
      const container = containerRef.current;
      if (!container) return value;

      const rect = container.getBoundingClientRect();
      const containerHeight = rect.height;
      const trackHeight = containerHeight - thumbSize;

      let relativeY = clientY - rect.top - thumbSize / 2;
      relativeY = Math.max(0, Math.min(relativeY, trackHeight));

      const progress = 1 - relativeY / trackHeight;
      const rawValue = MIN + progress * (MAX - MIN);
      const steppedValue = Math.round(rawValue / STEP) * STEP;
      return Math.min(MAX, Math.max(MIN, steppedValue));
    },
    [thumbSize, value],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const newValue = getValueFromPosition(e.clientY);
    onChange(newValue);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newValue = getValueFromPosition(e.clientY);
      onChange(newValue);
    },
    [isDragging, getValueFromPosition, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    const newValue = getValueFromPosition(touch.clientY);
    onChange(newValue);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      if (!touch) return;
      const newValue = getValueFromPosition(touch.clientY);
      onChange(newValue);
    },
    [isDragging, getValueFromPosition, onChange],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // eslint-disable-next-line react-hooks/refs
  const thumbTop = calculateThumbTop(value);

  return (
    <SliderContainer
      ref={containerRef}
      style={{ height }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={className}
    >
      <Track />
      <Thumb top={thumbTop} size={thumbSize} />
    </SliderContainer>
  );
}
