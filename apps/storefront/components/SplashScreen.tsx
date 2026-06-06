"use client";
import React from "react";
import BrandLoader from "./loaders/BrandLoader";

interface SplashScreenProps {
  visible: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ visible }) => {
  return <BrandLoader show={visible} withBackdrop size={220} />;
};

export default SplashScreen;
