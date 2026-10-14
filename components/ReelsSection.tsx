"use client";

import React, { useState, useRef, useEffect } from "react";

export interface ReelItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  duration: string;
  videoSrc: string;
  posterSrc: string;
  instagramUrl: string;
}

export const REELS_DATA: ReelItem[] = [
  {
    id: "cordy-sleep",
    title: "화장실 때문에 자다가 깨지 않는 밤",
    subtitle: "개운한 아침을 위한 야간뇨 케어",
    tag: "수면 & 야간뇨",
    duration: "00:57",
    videoSrc: "/videos/L14Cordy2.mp4?v=2",
    posterSrc: "/videos/L14Cordy2_thumb.jpg?v=2",
    instagramUrl: "https://www.instagram.com/lfourteen.life/",
  },
  {
    id: "l14-intro-formula",
    title: "특허 기술로 완성된 압도적 포뮬러",
    subtitle: "엘포틴 유산균 + 발효 동충하초 듀얼 배합",
    tag: "약학박사 개발",
    duration: "00:29",
    videoSrc: "/videos/L14Intro.mp4?v=2",
    posterSrc: "/videos/L14Intro_thumb.jpg?v=2",
    instagramUrl: "https://www.instagram.com/lfourteen.life/",
  },
  {
    id: "l14-belly-fat",
    title: "나이 들수록 나오는 배, 원인은?",
    subtitle: "체지방 & 대사 관리의 핵심",
    tag: "대사 & 체지방",
    duration: "01:25",
    videoSrc: "/videos/L14.mp4?v=2",
    posterSrc: "/videos/L14_thumb.jpg?v=2",
    instagramUrl: "https://www.instagram.com/lfourteen.life/",
  },
  {
    id: "cordyceps-power",
    title: "국제 학계가 주목하는 코디세핀의 힘",
    subtitle: "발효 동충하초 추출물의 놀라운 작용",
    tag: "발효동충하초",
    duration: "01:13",
    videoSrc: "/videos/cordyceps.mp4?v=2",
    posterSrc: "/videos/cordyceps_thumb.jpg?v=2",
    instagramUrl: "https://www.instagram.com/lfourteen.life/",
  },
];

export default function ReelsSection() {
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveReelIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // When modal opens/changes video, play it with mobile-friendly fallback
  useEffect(() => {
    if (activeReelIndex !== null && modalVideoRef.current) {
      modalVideoRef.current.currentTime = 0;
      const playPromise = modalVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If unmuted autoplay is blocked on mobile, mute and play
          if (modalVideoRef.current) {
            modalVideoRef.current.muted = true;
            modalVideoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [activeReelIndex]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  const handlePrevVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeReelIndex !== null) {
      setActiveReelIndex((activeReelIndex - 1 + REELS_DATA.length) % REELS_DATA.length);
    }
  };

  const handleNextVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeReelIndex !== null) {
      setActiveReelIndex((activeReelIndex + 1) % REELS_DATA.length);
    }
  };

  const activeReel = activeReelIndex !== null ? REELS_DATA[activeReelIndex] : null;

  return (
    <section className="w-full my-4 md:my-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white p-[3px]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </span>
            <span className="text-[12px] font-bold tracking-wider text-[#504530] uppercase">L14 Shorts & Reels</span>
          </div>
          <h2 className="text-[17px] md:text-[19px] font-bold text-[#1d1b18] leading-tight">
            엘포틴 영상 스토리
          </h2>
          <p className="text-[12px] md:text-[13px] text-[#7D766C] mt-0.5">
            약학박사가 전하는 건강 이야기 & 제품 연구 노트
          </p>
        </div>

        {/* Instagram Profile Link */}
        <a
          href="https://www.instagram.com/lfourteen.life/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3ede8] hover:bg-[#e8e1dc] text-[#504530] text-[12px] md:text-[13px] font-semibold transition-all hover:scale-105 active:scale-95 shadow-xs border border-[#cec5b9]/40"
        >
          <span>인스타 바로가기</span>
          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
        </a>
      </div>

      {/* Reel Cards Horizontal Slider */}
      <div className="relative group/carousel">
        {/* Desktop Arrow Left */}
        <button
          onClick={scrollLeft}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md border border-[#cec5b9]/40 items-center justify-center text-[#504530] hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Previous reels"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>

        {/* Carousel Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 scroll-smooth hide-scrollbar snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {REELS_DATA.map((reel, index) => (
            <div
              key={reel.id}
              onClick={() => setActiveReelIndex(index)}
              className="flex-shrink-0 w-[160px] md:w-[185px] aspect-[9/16] rounded-2xl overflow-hidden relative cursor-pointer group shadow-sm hover:shadow-lg transition-all duration-300 snap-start border border-[#cec5b9]/50 bg-black"
            >
              {/* Thumbnail Image */}
              <img
                src={reel.posterSrc}
                alt={reel.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Gradient Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35 group-hover:from-black/90 transition-colors pointer-events-none" />

              {/* Top Bar: Tag & Duration */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center z-10 pointer-events-none">
                <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] md:text-[11px] font-semibold text-white/90 border border-white/20">
                  {reel.tag}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white/80 font-mono">
                  {reel.duration}
                </span>
              </div>

              {/* Center Play Icon */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:scale-115 group-hover:bg-[#ee2a7b]/80 transition-all duration-300 shadow-md">
                  <span className="material-symbols-outlined text-[22px] ml-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_arrow
                  </span>
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-3 left-2.5 right-2.5 z-10 flex flex-col pointer-events-none">
                <p className="text-white font-bold text-[13px] md:text-[14px] leading-snug drop-shadow-md line-clamp-2">
                  {reel.title}
                </p>
                <div className="flex items-center gap-1 mt-1.5 text-white/70 text-[11px]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-[#ff80b0]">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span>@lfourteen.life</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Arrow Right */}
        <button
          onClick={scrollRight}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md border border-[#cec5b9]/40 items-center justify-center text-[#504530] hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100"
          aria-label="Next reels"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      {/* Fullscreen Video Modal */}
      {activeReel && activeReelIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 md:p-4 animate-in fade-in duration-200"
          onClick={() => setActiveReelIndex(null)}
        >
          <div
            className="relative w-full max-w-[420px] max-h-[92vh] h-full flex flex-col bg-[#141210] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar inside modal */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ee2a7b]/90 text-white font-semibold text-[11px] shadow-xs">
                  {activeReel.tag}
                </span>
                <span className="text-white/80 text-[12px] font-medium truncate max-w-[200px]">
                  {activeReel.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveReelIndex(null)}
                className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all border border-white/20 active:scale-90"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Main Video Area */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              <video
                key={activeReel.id}
                ref={modalVideoRef}
                src={activeReel.videoSrc}
                poster={activeReel.posterSrc}
                controls
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
              />

              {/* Prev Video Button (Desktop) */}
              <button
                onClick={handlePrevVideo}
                className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white items-center justify-center border border-white/20 transition-all hover:scale-110 active:scale-90"
                title="이전 영상"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              {/* Next Video Button (Desktop) */}
              <button
                onClick={handleNextVideo}
                className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white items-center justify-center border border-white/20 transition-all hover:scale-110 active:scale-90"
                title="다음 영상"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            {/* Bottom Controls / Action Bar */}
            <div className="p-3.5 bg-[#1e1b18] border-t border-white/10 flex flex-col gap-2 z-30">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h3 className="text-[14px] font-bold text-white line-clamp-1">{activeReel.title}</h3>
                  <p className="text-[12px] text-white/60 line-clamp-1">{activeReel.subtitle}</p>
                </div>
                <span className="text-[11px] text-white/40 font-mono">{activeReel.duration}</span>
              </div>

              {/* CTA Buttons */}
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={activeReel.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white font-bold text-[13px] hover:opacity-95 active:scale-98 transition-all shadow-sm"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span>인스타그램에서 보기</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setActiveReelIndex(null);
                    // scroll to purchase drawer or options
                    const buyBtn = document.getElementById("drawer-buy-btn") || document.getElementById("m-open-purchase");
                    if (buyBtn) {
                      buyBtn.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[13px] transition-all"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
