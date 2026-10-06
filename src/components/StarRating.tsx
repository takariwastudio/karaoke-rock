"use client";
import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number | null;
  interactive?: boolean;
  onRate?: (s: number) => void;
  size?: number;
}

export function StarRating({
  value,
  interactive = false,
  onRate,
  size = 20,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = interactive
          ? (hovered || value || 0) >= n
          : (value || 0) >= n;
        return (
          <button
            key={n}
            disabled={!interactive}
            onClick={() => onRate?.(n)}
            onMouseEnter={() => interactive && setHovered(n)}
            onMouseLeave={() => interactive && setHovered(0)}
            style={{ background: "none", border: "none", padding: 0 }}
            className={interactive ? "cursor-pointer" : "cursor-default"}
          >
            <Star
              size={size}
              className={filled ? "text-r-star fill-r-star" : "text-r-border"}
              fill={filled ? "#FFD60A" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}
