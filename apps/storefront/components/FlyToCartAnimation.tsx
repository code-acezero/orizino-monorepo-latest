"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export interface FlyToCartProps {
  imageSrc: string;
  startRect: DOMRect;
  onComplete: () => void;
}

const FlyToCartAnimation: React.FC<FlyToCartProps> = ({ imageSrc, startRect, onComplete }) => {
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const cartEl = document.getElementById("nav-cart-icon");
    if (cartEl) {
      const r = cartEl.getBoundingClientRect();
      setTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    } else {
      // fallback top-right
      setTarget({ x: window.innerWidth - 60, y: 32 });
    }
  }, []);

  if (!target) return null;

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;
  const midY = Math.min(startY, target.y) - 80;

  return createPortal(
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          className="fixed pointer-events-none z-[9999]"
          initial={{
            left: startX - 30,
            top: startY - 30,
            width: 60,
            height: 60,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            left: [startX - 30, (startX + target.x) / 2 - 15, target.x - 10],
            top: [startY - 30, midY - 15, target.y - 10],
            width: [60, 40, 20],
            height: [60, 40, 20],
            opacity: [1, 0.85, 0],
            scale: [1, 0.7, 0.3],
          }}
          transition={{
            duration: 0.65,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.5, 1],
          }}
          onAnimationComplete={() => {
            setShow(false);
            window.dispatchEvent(new CustomEvent("cart-fly-landed"));
          }}
        >
          <img
            src={imageSrc}
            alt=""
            className="w-full h-full rounded-full object-cover shadow-lg ring-2 ring-primary/50"
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FlyToCartAnimation;
