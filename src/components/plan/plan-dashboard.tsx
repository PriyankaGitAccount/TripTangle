'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TripTangleLogo } from '@/components/ui/logo';
import { ItineraryBuilder } from './itinerary-builder';
import { SharedMap } from './shared-map';
import { DailyPolls } from './daily-polls';
import { BudgetTracker } from './budget-tracker';
import { PhotoGallery } from './photo-gallery';
import type { Trip, Member, MapPin, Poll, PollResponse, Itinerary, ItinerarySuggestion, ItineraryData, Expense, TripPhoto } from '@/types';

type Tab = 'itinerary' | 'map' | 'polls' | 'budget' | 'photos';

const TABS: { id: Tab; label: string; icon: string; description: string }[] = [
  { id: 'itinerary', label: 'Itinerary',  icon: '📋', description: 'Day-by-day plan'    },
  { id: 'map',       label: 'Map',        icon: '🗺️', description: 'Pin places'          },
  { id: 'polls',     label: 'Polls',      icon: '📊', description: 'Vote on decisions'   },
  { id: 'budget',    label: 'Budget',     icon: '💰', description: 'Track expenses'      },
  { id: 'photos',    label: 'Photos',     icon: '📸', description: 'Share memories'      },
];

interface PlanDashboardProps {
  trip: Trip;
  members: Member[];
  currentMemberId: string;
  initialItinerary: Itinerary | null;
  initialSuggestions: ItinerarySuggestion[];
  initialPins: MapPin[];
  initialPolls: Poll[];
  initialResponses: PollResponse[];
  initialExpenses: Expense[];
  initialPhotos: TripPhoto[];
  initialTab: Tab;
}

// ── Compass watermark (same as dashboard) ─────────────────────────
function CompassRose({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="97" stroke="currentColor" strokeWidth="0.7" opacity="0.5"/>
      <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
      <circle cx="100" cy="100" r="58" stroke="currentColor" strokeWidth="0.5" opacity="0.25"/>
      <circle cx="100" cy="100" r="38" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
      {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((angle) => {
        const isCardinal = angle % 90 === 0;
        const isOrdinal  = angle % 45 === 0;
        return (
          <line key={angle} x1="100" y1={isCardinal ? '3' : isOrdinal ? '12' : '22'}
            x2="100" y2="97" stroke="currentColor"
            strokeWidth={isCardinal ? '1.2' : isOrdinal ? '0.7' : '0.4'}
            opacity={isCardinal ? 0.45 : isOrdinal ? 0.3 : 0.15}
            transform={`rotate(${angle} 100 100)`}/>
        );
      })}
      <path d="M100 22 L105 95 L178 100 L105 105 L100 178 L95 105 L22 100 L95 95Z"
        fill="currentColor" opacity="0.12"/>
      <text x="100" y="11" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.55" fontWeight="bold" fontFamily="Georgia, serif">N</text>
      <text x="100" y="196" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">S</text>
      <text x="192" y="104" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">E</text>
      <text x="8"   y="104" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4" fontFamily="Georgia, serif">W</text>
      <circle cx="100" cy="100" r="3.5" fill="currentColor" opacity="0.35"/>
    </svg>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded-xl transition-colors font-medium"
        style={{ color: '#7a6350', background: 'rgba(255,255,255,0.6)' }}
      >
        Log out
      </button>
    </form>
  );
}

export function PlanDashboard({
  trip, members, currentMemberId, initialItinerary, initialSuggestions,
  initialPins, initialPolls, initialResponses, initialExpenses, initialPhotos, initialTab,
}: PlanDashboardProps) {
  const [activeTab, setActiveTab]         = useState<Tab>(initialTab);
  const [itinerary, setItinerary]         = useState<Itinerary | null>(initialItinerary);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const memberId = currentMemberId;

  const itineraryData: ItineraryData | undefined = itinerary?.itinerary_json;
  const itineraryLat = itineraryData?.destination_lat;
  const itineraryLng = itineraryData?.destination_lng;

  const tripIsOver = !!trip.locked_dates_end &&
    new Date(trip.locked_dates_end + 'T23:59:59') < new Date();

  const destKeyword = trip.destination
    ? encodeURIComponent(trip.destination.split(',')[0])
    : 'travel,europe,city';
  const bgPhotoUrl = `https://source.unsplash.com/1920x1080/?${destKeyword},city,travel`;

  return (
    <div className="min-h-screen relative overflow-x-hidden">

      {/* ── Fixed background: blurred destination photo + warm overlay ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgPhotoUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'blur(2px) brightness(0.75) saturate(0.85)' }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(242, 232, 215, 0.72)' }}/>
      </div>

      {/* Compass watermarks */}
      <div className="fixed top-16 right-8 text-[#7a6045] pointer-events-none select-none opacity-40">
        <CompassRose size={220}/>
      </div>
      <div className="fixed bottom-8 left-4 text-[#7a6045] pointer-events-none select-none opacity-35">
        <CompassRose size={170}/>
      </div>

      {/* ── Sticky nav (same as dashboard) ───────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/30 bg-white/70 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <TripTangleLogo size={30}/>
            <span className="font-black text-[#3d2b1f] tracking-tight text-lg"
              style={{ fontFamily: 'Georgia, serif' }}>
              TripTangle
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-medium hidden sm:block hover:underline underline-offset-2"
              style={{ color: '#5a4a38' }}
            >
              ← My Trips
            </Link>
            <LogoutButton/>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-8 pb-20">

        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="mb-7">
          {/* Mobile-only back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold mb-3 sm:hidden"
            style={{ color: '#c4694a' }}
          >
            ← My Trips
          </Link>

          <p className="text-sm font-semibold mb-0.5" style={{ color: '#c4694a' }}>
            Trip Plan
          </p>
          <h1 className="text-2xl font-black tracking-tight leading-tight mb-2"
            style={{ color: '#2d1f14', fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {trip.name} 🚀
          </h1>

          {/* Destination + dates */}
          {itineraryData ? (
            <div>
              <p className="text-xl font-bold mb-2" style={{ color: '#2d1f14' }}>
                {itineraryData.destination}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {trip.locked_dates_start && trip.locked_dates_end && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold shadow-sm"
                    style={{ color: '#3d2b1f' }}>
                    🔒 {trip.locked_dates_start} → {trip.locked_dates_end}
                  </span>
                )}
                {(() => {
                  if (!trip.locked_dates_start || !trip.locked_dates_end) return null;
                  const days = Math.round(
                    (new Date(trip.locked_dates_end + 'T00:00:00').getTime() -
                      new Date(trip.locked_dates_start + 'T00:00:00').getTime()) /
                      86_400_000
                  ) + 1;
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm"
                      style={{ background: 'rgba(212, 98, 42, 0.12)', color: '#d4622a' }}>
                      {days} {days === 1 ? 'day' : 'days'}
                    </span>
                  );
                })()}
                {itineraryData.season && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 shadow-sm px-3 py-1 text-xs font-medium text-amber-800">
                    🌤 {itineraryData.season}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xl font-bold mb-2" style={{ color: '#2d1f14' }}>
                {trip.destination}
              </p>
              {trip.locked_dates_start && trip.locked_dates_end && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold shadow-sm"
                    style={{ color: '#3d2b1f' }}>
                    🔒 {trip.locked_dates_start} → {trip.locked_dates_end}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-7">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const locked = (tab.id === 'map' || tab.id === 'polls') && (!itinerary || itineraryLoading);
            return (
              <button
                key={tab.id}
                onClick={() => !locked && setActiveTab(tab.id)}
                disabled={locked}
                title={locked ? 'Generate an itinerary first' : undefined}
                className={`flex-1 flex flex-col items-center gap-0.5 rounded-2xl py-3 px-2 text-center transition-all duration-200 ${
                  active
                    ? 'text-white shadow-lg scale-[1.02]'
                    : locked
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:shadow-md hover:scale-[1.01]'
                }`}
                style={
                  active
                    ? { background: 'linear-gradient(135deg, #d4622a 0%, #e07b3a 100%)' }
                    : locked
                    ? { background: 'rgba(255,255,255,0.5)' }
                    : { background: 'rgba(255,255,255,0.78)' }
                }
              >
                <span className="text-xl leading-none">
                  {locked ? (itineraryLoading ? '⏳' : '🔒') : tab.icon}
                </span>
                <span className={`text-xs font-bold leading-tight ${active ? 'text-white' : 'text-[#3d2b1f]'}`}>
                  {tab.label}
                </span>
                <span className={`hidden sm:block text-[10px] leading-tight ${
                  active ? 'text-white/80' : 'text-[#7a6350]'
                }`}>
                  {locked ? (itineraryLoading ? 'Loading…' : 'Needs itinerary') : tab.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab content ───────────────────────────────────────────── */}
        <div className="flex flex-col w-full">
          {activeTab === 'itinerary' && (
            <ItineraryBuilder
              tripId={trip.id}
              destination={trip.destination}
              lockedStart={trip.locked_dates_start}
              lockedEnd={trip.locked_dates_end}
              currentMemberId={memberId}
              members={members}
              itinerary={itinerary}
              initialSuggestions={initialSuggestions}
              onItineraryChange={setItinerary}
              onLoadingChange={setItineraryLoading}
            />
          )}
          {activeTab === 'map' && itinerary && (
            <SharedMap
              tripId={trip.id}
              currentMemberId={memberId}
              members={members}
              initialPins={initialPins}
              defaultLat={itineraryLat}
              defaultLng={itineraryLng}
              itinerary={itineraryData}
            />
          )}
          {activeTab === 'polls' && (
            <DailyPolls
              tripId={trip.id}
              currentMemberId={memberId}
              members={members}
              initialPolls={initialPolls}
              initialResponses={initialResponses}
            />
          )}
          {activeTab === 'budget' && (
            <BudgetTracker
              tripId={trip.id}
              currentMemberId={memberId}
              members={members}
              initialExpenses={initialExpenses}
              tripIsOver={tripIsOver}
            />
          )}
          {activeTab === 'photos' && (
            <PhotoGallery
              tripId={trip.id}
              currentMemberId={memberId}
              members={members}
              initialPhotos={initialPhotos}
            />
          )}
        </div>
      </main>
    </div>
  );
}
