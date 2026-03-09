import React from "react";

export function TechnicalGridBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 opacity-10"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(249, 249, 6, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(249, 249, 6, 0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}
    ></div>
  );
}
