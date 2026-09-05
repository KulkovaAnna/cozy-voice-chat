import { useRef, useState, useCallback, useEffect } from "react";
import { SliderContainer, Track, Thumb } from "./Slider.styles";

interface HorizontalSliderProps {
  value: number;
  onChange: (value: number) => void;
  width?: number;
  className?: string;
  thumbSize?: number;
  id?: string;
}

const MIN = 0,
  MAX = 1,
  STEP = 0.1;

export function HorizontalSlider(props: HorizontalSliderProps) {
  const { onChange, value, className, width, thumbSize = 24 } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Прогресс (0..1) – вычисляется синхронно
  const progress = Math.max(0, Math.min(1, (value - MIN) / (MAX - MIN)));

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return value;

      const rect = container.getBoundingClientRect();
      const padding = thumbSize / 2;
      const trackWidth = rect.width - 2 * padding; // полезная ширина трека

      let relativeX = clientX - rect.left - padding;
      relativeX = Math.max(0, Math.min(relativeX, trackWidth));

      const progress = relativeX / trackWidth;
      const rawValue = MIN + progress * (MAX - MIN);
      const steppedValue = Math.round(rawValue / STEP) * STEP;
      return Math.min(MAX, Math.max(MIN, steppedValue));
    },
    [thumbSize, value],
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
    <SliderContainer
      id={props.id}
      ref={containerRef}
      style={{ width: width ?? "100%" }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={className}
      thumbSize={thumbSize}
    >
      <Track volume={value} />
      <Thumb progress={progress} size={thumbSize} />
    </SliderContainer>
  );
}
