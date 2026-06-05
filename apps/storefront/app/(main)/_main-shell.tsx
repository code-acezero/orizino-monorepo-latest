"use client";
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLayout } from "@/contexts/LayoutContext";

export default function MainShell({ children }: { children: React.ReactNode }) {
  const { productTray } = useLayout();
  return (
    <div className="min-h-screen flex flex-col">
      <React.Suspense fallback={null}>
        <Navbar bottomNavProductTray={productTray} />
      </React.Suspense>
      <div className="flex-grow">
        <React.Suspense fallback={null}>
          {children}
        </React.Suspense>
      </div>
      <React.Suspense fallback={null}>
        <Footer />
      </React.Suspense>
    </div>
  );
}
