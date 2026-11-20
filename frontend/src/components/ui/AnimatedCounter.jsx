import React, { useEffect, useState, useRef } from "react";

/**
 * AnimatedCounter
 * Smoothly animates numeric transitions over 400ms using requestAnimationFrame.
 * Automatically respects prefers-reduced-motion.
 */
export function useAnimatedNumber(targetValue, duration = 400) {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const startValRef = useRef(targetValue);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || typeof targetValue !== "number" || isNaN(targetValue)) {
      setCurrentValue(targetValue);
      startValRef.current = targetValue;
      return;
    }

    const startVal = startValRef.current;
    const diff = targetValue - startVal;
    if (diff === 0) return;

    startTimeRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextVal = startVal + diff * ease;

      setCurrentValue(Math.round(nextVal * 10) / 10);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(targetValue);
        startValRef.current = targetValue;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetValue, duration]);

  return currentValue;
}

export default function AnimatedCounter({ value, prefix = "", suffix = "", className = "" }) {
  const isNumeric = typeof value === "number" || (!isNaN(Number(value)) && value !== "");
  const numValue = isNumeric ? Number(value) : 0;
  const animated = useAnimatedNumber(numValue);

  if (!isNumeric) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={className}>
      {prefix}
      {Number.isInteger(numValue) ? Math.round(animated) : animated.toFixed(1)}
      {suffix}
    </span>
  );
}
