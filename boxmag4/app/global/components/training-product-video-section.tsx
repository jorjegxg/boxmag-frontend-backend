"use client";

import { useRef, useState } from "react";

const DEFAULT_VIDEO_SRC =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function DotsPattern({ className }: { className?: string }) {
  return (
    <div
      className={`absolute grid grid-cols-2 gap-2 opacity-40 ${className ?? ""}`}
      aria-hidden
    >
      {[...Array(8)].map((_, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-600"
        />
      ))}
    </div>
  );
}

type TrainingProductVideoSectionProps = {
  videoSrc?: string;
  posterSrc?: string;
};

export function TrainingProductVideoSection({
  videoSrc = DEFAULT_VIDEO_SRC,
  posterSrc = "/placeholders/box.png",
}: TrainingProductVideoSectionProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (video) {
      video.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  return (
    <section className="relative w-full bg-teal-500 py-16 px-6 lg:px-20 overflow-hidden">
      {/* Decorative dots */}
      <DotsPattern className="top-6 left-6" />
      <DotsPattern className="bottom-6 right-6" />

      <div className="relative max-w-7xl mx-auto">
        <h2 className="text-center text-2xl sm:text-3xl lg:text-4xl font-bold text-black uppercase tracking-wide mb-10">
          Show the training product video
        </h2>

        <div className="flex justify-center">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-lg overflow-hidden relative aspect-video max-h-[480px]">
            {/* Video element */}
            <video
              ref={videoRef}
              src={videoSrc}
              poster={posterSrc}
              controls
              className="w-full h-full object-cover rounded-3xl"
              onPause={handlePause}
              onEnded={handlePause}
              preload="metadata"
            />
            {/* Play button overlay – shown when video is paused and not yet started */}
            {!isPlaying && (
              <button
                type="button"
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-3xl"
                aria-label="Play training product video"
              >
                <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-my-yellow flex items-center justify-center shadow-lg hover:scale-105 transition-transform pointer-events-none">
                  <span className="w-0 h-0 border-t-[12px] border-b-[12px] border-l-[20px] border-t-transparent border-b-transparent border-l-white ml-1" />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
