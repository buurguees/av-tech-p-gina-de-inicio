import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import NexoAvLayout from "./layouts/NexoAvLayout";
import NexoAvLayoutMobile from "./layouts/NexoAvLayoutMobile";

const NexoLogo = () => {
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsLightTheme(document.body.classList.contains('nexo-av-theme'));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsLightTheme(document.body.classList.contains('nexo-av-theme'));
  }, [document.body.className]);

  if (isLightTheme) {
    return (
      <svg
        width="40"
        height="40"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10"
      >
        <path d="M500 493.902L256.098 250H340.779L500 409.045V493.902Z" fill="currentColor" />
        <path d="M256.098 250L500 6.09766V90.7789L340.955 250H256.098Z" fill="currentColor" />
        <path d="M250 243.902L6.09753 -7.62939e-05H90.7788L250 159.045V243.902Z" fill="currentColor" />
        <path d="M493.902 -0.000106812L250 243.902V159.221L409.045 -0.000106812H493.902Z" fill="currentColor" />
        <path d="M250 256.098L493.902 500H409.221L250 340.955V256.098Z" fill="currentColor" />
        <path d="M6.09753 500L250 256.098V340.779L90.9553 500H6.09753Z" fill="currentColor" />
        <path d="M3.05176e-05 6.09766L243.902 250H159.221L3.05176e-05 90.9554V6.09766Z" fill="currentColor" />
        <path d="M243.902 250L4.57764e-05 493.902V409.221L159.045 250H243.902Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-10 h-10"
    >
      <path d="M750 743.902L506.098 500H590.779L750 659.045V743.902Z" fill="white" />
      <path d="M506.098 500L750 256.098V340.779L590.955 500H506.098Z" fill="white" />
      <path d="M500 493.902L256.098 250H340.779L500 409.045V493.902Z" fill="white" />
      <path d="M743.902 250L500 493.902V409.221L659.045 250H743.902Z" fill="white" />
      <path d="M500 506.098L743.902 750H659.221L500 590.955V506.098Z" fill="white" />
      <path d="M256.098 750L500 506.098V590.779L340.955 750H256.098Z" fill="white" />
      <path d="M250 256.098L493.902 500H409.221L250 340.955V256.098Z" fill="white" />
      <path d="M493.902 500L250 743.902V659.221L409.045 500H493.902Z" fill="white" />
    </svg>
  );
};

/**
 * Componente principal de navegación para NEXO AV
 * Redirige al layout correspondiente según el dispositivo (mobile o desktop)
 */
const NexoAv = () => {
  const isMobile = useIsMobile();
  const Layout = isMobile ? NexoAvLayoutMobile : NexoAvLayout;
  return <Layout />;
};

export default NexoAv;
export { NexoLogo };
