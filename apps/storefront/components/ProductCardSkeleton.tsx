"use client";
import React from "react";

const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`glass rounded-3xl overflow-hidden flex flex-col h-full animate-pulse ${className}`}>
    <div className="aspect-square bg-secondary/40" />
    <div className="p-4 flex flex-col gap-2">
      <div className="h-4 bg-secondary/40 rounded-full w-3/4" />
      <div className="h-3 bg-secondary/30 rounded-full w-1/2" />
      <div className="flex gap-1 mt-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-secondary/30" />
        ))}
      </div>
      <div className="h-5 bg-secondary/40 rounded-full w-1/3 mt-2" />
      <div className="h-9 bg-secondary/30 rounded-xl w-full mt-3" />
    </div>
  </div>
);

export default React.memo(ProductCardSkeleton);
