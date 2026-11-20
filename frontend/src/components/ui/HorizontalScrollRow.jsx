import React, { useRef, useState, useEffect } from "react";

/**
 * HorizontalScrollRow
 * A shared responsive wrapper for pill rows, sub-tabs, and stat chips.
 * - Enables smooth touch horizontal scrolling on mobile
 * - Hides the visual scrollbar chrome
 * - Adds a subtle edge fade/gradient mask when more content is scrollable
 */
export default function HorizontalScrollRow({
  children,
  className = "",
  contentClassName = "flex items-center space-x-2 shrink-0",
  fadeTheme = "dark", // "dark" | "black" | "white" | "slate"
  showIndicators = true
}) {
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    // Observer for child changes (e.g., dynamic pills or state updates)
    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  // Theme-specific fade gradient classes
  const fadeLeftClass = {
    dark: "from-[#12151e] via-[#12151e]/80 to-transparent",
    black: "from-[#0c0e14] via-[#0c0e14]/80 to-transparent",
    white: "from-white via-white/80 to-transparent",
    slate: "from-[#171b26] via-[#171b26]/80 to-transparent",
    innerDark: "from-[#11141c] via-[#11141c]/80 to-transparent"
  }[fadeTheme] || "from-[#0c0e14] to-transparent";

  const fadeRightClass = {
    dark: "from-transparent via-[#12151e]/80 to-[#12151e]",
    black: "from-transparent via-[#0c0e14]/80 to-[#0c0e14]",
    white: "from-transparent via-white/80 to-white",
    slate: "from-transparent via-[#171b26]/80 to-[#171b26]",
    innerDark: "from-transparent via-[#11141c]/80 to-[#11141c]"
  }[fadeTheme] || "from-transparent to-[#0c0e14]";

  return (
    <div className={`relative max-w-full min-w-0 ${className}`}>
      {/* Left Fade Indicator */}
      {showIndicators && canScrollLeft && (
        <div
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r ${fadeLeftClass} transition-opacity duration-200`}
          aria-hidden="true"
        />
      )}

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        className="overflow-x-auto overscroll-x-contain no-scrollbar scroll-smooth w-full min-w-0"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none"
        }}
      >
        <div className={contentClassName}>
          {children}
        </div>
      </div>

      {/* Right Fade Indicator */}
      {showIndicators && canScrollRight && (
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r ${fadeRightClass} transition-opacity duration-200`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
