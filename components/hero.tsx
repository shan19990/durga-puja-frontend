"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react'; // ✅ CORRECT

interface FloatingElement {
  left: string;
  top: string;
  delay: string;
  duration: string;
  size: number;
}

export default function Hero() {
  const [currentText, setCurrentText] = useState(0);
  const [floatingElements, setFloatingElements] = useState<FloatingElement[]>([]);
  const texts = ["Explore Sacred Pandals", "Plan Your Journey", "Discover Traditions", "Experience Devotion"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentText((prev) => (prev + 1) % texts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const elements = Array.from({ length: 20 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${3 + Math.random() * 2}s`,
      size: 16 + Math.random() * 16,
    }));
    setFloatingElements(elements);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 animate-gradientShift"></div>

      <div className="absolute inset-0 overflow-hidden">
        {floatingElements.map((el, i) => (
          <div
            key={i}
            className="absolute animate-pulse-custom"
            style={{
              left: el.left,
              top: el.top,
              animationDelay: el.delay,
              animationDuration: el.duration,
            }}
          >
            <Sparkles className="text-yellow-200 opacity-30" size={el.size} />
          </div>
        ))}
      </div>

      <div className="relative z-10 text-center w-full px-4 mx-auto mt-36 mb-20">
        <DotLottieReact
          src="https://lottie.host/86166320-72cd-4b72-8d90-7b7f926367f4/5m83AObao4.lottie"
          loop
          autoplay
          style={{ width: '200px', height: '200px', margin: '0 auto' }}
        />

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          DURGA PUJA
          <span className="block text-yellow-300">PANDALS</span>
        </h1>

        <div className="h-16 mb-2 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
          <p className="text-xl md:text-2xl text-white/90 transition-all duration-500">{texts[currentText]}</p>
        </div>

        <p
          className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed animate-fadeInUp"
          style={{ animationDelay: "0.6s" }}
        >
          Discover the magnificent Durga Puja celebrations across Kolkata. Explore sacred pandals, plan your
          spiritual journey, and immerse yourself in Bengal's rich cultural heritage.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeInUp"
          style={{ animationDelay: "0.8s" }}
        >
          <button
            className="px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            onClick={() => {
              document.getElementById("map")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Explore Pandals
          </button>
          <button
            className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg border-2 border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            onClick={() => {
              window.location.href = "/planner";
            }}
          >
            Plan Journey
          </button>
        </div>
      </div>
    </section>
  );
}
