'use client';

import { useState } from 'react';
import { formatDateRange, daysBetween } from '@/lib/trip-utils';

interface LockBannerProps {
  start: string;
  end: string;
  tripName: string;
}

function extractLocationKeyword(name: string): string {
  const stopWords = new Set([
    'trip','tour','travel','vacation','holiday','weekend',
    'getaway','2024','2025','2026','2027','and','the','a','to','for','with','our',
  ]);
  const words = name.split(/\s+/);
  const keywords = words.filter(w => !stopWords.has(w.toLowerCase()) && w.length > 2);
  return encodeURIComponent((keywords.length > 0 ? keywords.join(' ') : name) + ' travel destination landscape');
}

export function LockBanner({ start, end, tripName }: LockBannerProps) {
  const [imgError, setImgError] = useState(false);
  const keyword = extractLocationKeyword(tripName);
  const imageUrl = `https://source.unsplash.com/800x400/?${keyword}`;
  const duration = daysBetween(start, end);

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg">
      {/* Destination photo */}
      {!imgError ? (
        <div className="relative h-36 w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={tripName}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {/* Location name on photo */}
          <div className="absolute bottom-3 left-3">
            <p className="text-white text-xs font-medium opacity-80">{tripName}</p>
          </div>
        </div>
      ) : (
        /* Fallback gradient */
        <div
          className="h-36 w-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #9A3412, #EA580C)' }}
        >
          <span className="text-5xl">🌍</span>
        </div>
      )}

      {/* Dates section */}
      <div className="bg-brand-green px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">
            🔒 Dates Locked
          </p>
          <p className="text-white font-bold text-base leading-tight">
            {formatDateRange(start, end)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-xl">{duration}</p>
          <p className="text-white/70 text-[10px] uppercase tracking-wide">days</p>
        </div>
      </div>
    </div>
  );
}
