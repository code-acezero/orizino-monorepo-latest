"use client";
import { useLocation, Link } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-end overflow-hidden relative"
      style={{ background: "hsl(var(--background))" }}>

      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-20 animate-pulse"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)",
            top: "10%", left: "20%",
            filter: "blur(80px)",
          }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, hsl(var(--accent) / 0.5), transparent 70%)",
            top: "40%", right: "10%",
            filter: "blur(60px)",
            animation: "move-blob 6s ease-in-out infinite alternate",
          }} />
      </div>

      {/* Main text container */}
      <div className="absolute top-[15%] md:top-[20%] text-center z-10 px-4">
        <motion.h1
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-[6rem] md:text-[8rem] font-display font-bold leading-none"
          style={{
            color: "hsl(var(--primary))",
            textShadow: "4px 4px 0px hsl(var(--background))",
            transform: `rotate(-3deg)`,
          }}
        >
          404
        </motion.h1>
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-3xl font-display font-bold text-foreground mt-2"
        >
          Oh Crumbs!
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mt-3 text-sm md:text-base max-w-md mx-auto"
        >
          Looks like someone escaped with the page you were looking for.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-3 justify-center mt-6"
        >
          <Link
            to="/brandconfig/home"
            className="btn-pill bg-gradient-primary text-primary-foreground font-semibold px-6 py-3 flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link
            to="/admin/products"
            className="btn-pill glass text-foreground font-semibold px-6 py-3 flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Search className="w-4 h-4" /> Browse Shop
          </Link>
        </motion.div>
      </div>

      {/* Mouse hole */}
      <div className="relative z-[4] mb-0" style={{ transform: "translateY(1px)" }}>
        <div
          className="w-32 h-36 md:w-40 md:h-44 relative overflow-hidden"
          style={{
            background: "hsl(var(--background))",
            borderRadius: "100px 100px 0 0",
            border: "4px solid hsl(var(--border))",
            borderBottom: "none",
            boxShadow: "inset 0 20px 40px hsl(0 0% 0% / 0.8)",
          }}
        >
          {/* Eyes inside hole */}
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
            <div className="w-6 h-8 md:w-7 md:h-9 bg-foreground/90 rounded-full relative" style={{ animation: "blink-404 4s infinite" }}>
              <div className="w-3 h-3 bg-background rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `translate(calc(-50% + ${(mousePos.x - 50) * 0.15}px), calc(-50% + ${(mousePos.y - 50) * 0.15}px))`,
                  transition: "transform 0.1s ease",
                }} />
            </div>
            <div className="w-6 h-8 md:w-7 md:h-9 bg-foreground/90 rounded-full relative" style={{ animation: "blink-404 4s infinite" }}>
              <div className="w-3 h-3 bg-background rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `translate(calc(-50% + ${(mousePos.x - 50) * 0.15}px), calc(-50% + ${(mousePos.y - 50) * 0.15}px))`,
                  transition: "transform 0.1s ease",
                }} />
            </div>
          </div>
        </div>
      </div>

      {/* Cheese */}
      <div className="absolute bottom-[15vh] z-[6]" style={{ left: "calc(50% + 100px)" }}>
        <div style={{
          width: 0, height: 0,
          borderStyle: "solid",
          borderWidth: "0 0 40px 70px",
          borderColor: "transparent transparent hsl(45 100% 50%) transparent",
          filter: "drop-shadow(2px 4px 4px hsl(0 0% 0% / 0.3))",
        }} />
      </div>

      {/* Floor */}
      <div className="w-full h-[15vh] relative z-[5]"
        style={{
          background: "hsl(var(--card))",
          borderTop: "4px solid hsl(var(--border))",
        }} />

      {/* Character images */}
      <img src="/images/404-cat.png" alt="" className="absolute bottom-[68px] right-[5%] w-48 md:w-80 lg:w-[400px] z-[7] pointer-events-none hidden md:block" />
      <img src="/images/404-mouse.png" alt="" className="absolute bottom-[15vh] left-[5%] w-48 md:w-72 lg:w-[450px] z-[7] pointer-events-none hidden md:block" />
    </div>
  );
};

export default NotFound;
