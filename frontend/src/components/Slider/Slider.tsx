import { useRef, useState, useCallback, useEffect } from "react";
import * as Styles from "./Slider.styles";

interface HorizontalSliderProps {
  value: number;
  onChange: (value: number) => void;
  width?: number;
  className?: string;
  thumbSize?: number;
  trackHeight?: number;
  id?: string;
  step?: number;
  max?: number;
  min?: number;
}

const MIN = 0,
  MAX = 1,
  STEP = 0.1,
  TRACK_HEIGHT = 8,
  THUMB_SIZE = 24;

export function HorizontalSlider(props: HorizontalSliderProps) {
  const {
    onChange,
    value,
    className,
    width,
    thumbSize = THUMB_SIZE,
    trackHeight = TRACK_HEIGHT,
    step = STEP,
    max = MAX,
    min = MIN,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progress = Math.max(min, Math.min(max, (value - min) / (max - min)));

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return value;

      const rect = container.getBoundingClientRect();
      const padding = thumbSize / 2;
      const trackWidth = rect.width - 2 * padding;

      let relativeX = clientX - rect.left - padding;
      relativeX = Math.max(0, Math.min(relativeX, trackWidth));

      const progress = relativeX / trackWidth;
      const rawValue = min + progress * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.min(max, Math.max(min, steppedValue));
    },
    [thumbSize, value, step, max, min],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    onChange(getValueFromPosition(e.clientX));
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      onChange(getValueFromPosition(e.clientX));
    },
    [isDragging, getValueFromPosition, onChange],
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    onChange(getValueFromPosition(touch.clientX));
  };
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      if (!touch) return;
      onChange(getValueFromPosition(touch.clientX));
    },
    [isDragging, getValueFromPosition, onChange],
  );
  const handleTouchEnd = useCallback(() => setIsDragging(false), []);

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

  return (
    <Styles.SliderContainer
      id={props.id}
      ref={containerRef}
      style={{ width: width ?? "100%" }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={className}
      thumbSize={thumbSize}
      trackHeight={trackHeight}
    >
      <Styles.Track volume={value} height={trackHeight} />
      <Styles.Thumb progress={progress} size={thumbSize} />
    </Styles.SliderContainer>
  );
}
