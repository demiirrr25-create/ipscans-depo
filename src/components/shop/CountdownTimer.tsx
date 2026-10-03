"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  dict: {
    countdownTitle: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
}

export function CountdownTimer({ dict }: CountdownTimerProps) {
  // Target date set to 30 days from now for a realistic opening countdown
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 8,
    minutes: 45,
    seconds: 22,
  });

  useEffect(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: dict.days, value: timeLeft.days },
    { label: dict.hours, value: timeLeft.hours },
    { label: dict.minutes, value: timeLeft.minutes },
    { label: dict.seconds, value: timeLeft.seconds },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-neutral-900/90 to-black/80 backdrop-blur-md shadow-2xl text-center">
      <h3 className="text-xs uppercase tracking-[0.3em] text-amber-400 font-semibold mb-6">
        {dict.countdownTitle}
      </h3>
      <div className="grid grid-cols-4 gap-3 sm:gap-6">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-white/10 bg-white/[0.03] shadow-inner"
          >
            <span className="font-[family-name:var(--font-display)] text-2xl sm:text-4xl font-extrabold text-amber-200 tracking-tight">
              {String(item.value).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
