"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { storefrontHref } from "@/lib/cross-app-urls";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Products", href: "/products" },
  { label: "News", href: "/news" },
  { label: "Shop", href: null, external: true },
];

export function CompanyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shopUrl = storefrontHref("/");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || open ? "bg-black/80 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="font-display text-xl font-bold tracking-tight text-white">
          ORIZINO
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-1.5 rounded-full border border-white/20 hover:border-white/50"
              >
                {link.label} ↗
              </a>
            ) : (
              <a
                key={link.label}
                href={link.href!}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        {/* Mobile burger */}
        <button
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-black/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex flex-col gap-3"
          >
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-white/70 hover:text-white py-2"
                >
                  {link.label} ↗
                </a>
              ) : (
                <a
                  key={link.label}
                  href={link.href!}
                  onClick={() => setOpen(false)}
                  className="text-sm text-white/70 hover:text-white py-2"
                >
                  {link.label}
                </a>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
