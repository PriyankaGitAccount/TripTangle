'use client';

import { useState } from 'react';
import { useMemberIdentity } from '@/hooks/use-member-identity';
import { ItineraryBuilder } from './itinerary-builder';
import { SharedMap } from './shared-map';
import { DailyPolls } from './daily-polls';
import { BudgetTracker } from './budget-tracker';
import { PhotoGallery } from './photo-gallery';
import type { Trip, Member, MapPin, Poll, PollResponse, Itinerary, ItinerarySuggestion, ItineraryData, Expense, TripPhoto } from '@/types';

type Tab = 'itinerary' | 'map' | 'polls' | 'budget' | 'photos';

const TABS: { id: Tab; label: string; icon: string; description: string }[] = [
  { id: 'itinerary', label: 'Itinerary',  icon: '📋', description: 'Day-by-day plan'     },
  { id: 'map',       label: 'Map',        icon: '🗺️', description: 'Pin places together'  },
  { id: 'polls',     label: 'Polls',      icon: '📊', description: 'Vote on decisions'    },
  { id: 'budget',    label: 'Budget',     icon: '💰', description: 'Track expenses'       },
  { id: 'photos',    label: 'Photos',     icon: '📸', description: 'Share memories'       },
];

interface PlanDashboardProps {
  trip: Trip;
  members: Member[];
  initialItinerary: Itinerary | null;
  initialSuggestions: ItinerarySuggestion[];
  initialPins: MapPin[];
  initialPolls: Poll[];
  initialResponses: PollResponse[];
  initialExpenses: Expense[];
  initialPhotos: TripPhoto[];
  initialTab: Tab;
}

export function PlanDashboard({
  trip, members, initialItinerary, initialSuggestions,
  initialPins, initialPolls, initialResponses, initialExpenses, initialPhotos, initialTab,
}: PlanDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [itinerary, setItinerary] = useState<Itinerary | null>(initialItinerary);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const { memberId } = useMemberIdentity(trip.id);

  const itineraryData: ItineraryData | undefined = itinerary?.itinerary_json;
  const itineraryLat = itineraryData?.destination_lat;
  const itineraryLng = itineraryData?.destination_lng;

  const tripIsOver = !!trip.locked_dates_end &&
    new Date(trip.locked_dates_end + 'T23:59:59') < new Date();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-5 pb-20">

      {/* ── Page header ── */}
      <div className="mb-6 space-y-2">
        <a href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← My Trips
        </a>
        <h1 className="text-xl font-bold tracking-tight text-brand-deep">{trip.name} 🚀</h1>

        {/* Destination meta — shown once itinerary is loaded */}
        {itineraryData ? (
          <div className="space-y-0.5">
            <p className="text-2xl font-bold text-brand-deep">{itineraryData.destination}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {trip.locked_dates_start && trip.locked_dates_end && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-deep">
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-bright/10 px-3 py-1 text-xs font-bold text-brand-bright">
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
          <div className="space-y-0.5">
            <p className="text-2xl font-bold text-brand-deep">{trip.destination}</p>
            {trip.locked_dates_start && trip.locked_dates_end && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-deep">
                  🔒 {trip.locked_dates_start} → {trip.locked_dates_end}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
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
                  ? 'bg-brand-bright text-white shadow-lg shadow-brand-bright/20 scale-[1.02]'
                  : locked
                  ? 'bg-card text-muted-foreground/40 shadow-sm cursor-not-allowed'
                  : 'bg-card text-muted-foreground shadow-sm hover:shadow-md hover:text-foreground'
              }`}
            >
              <span className="text-xl leading-none">{locked ? (itineraryLoading ? '⏳' : '🔒') : tab.icon}</span>
              <span className={`text-xs font-bold leading-tight ${active ? 'text-white' : ''}`}>
                {tab.label}
              </span>
              <span className={`hidden sm:block text-[10px] leading-tight ${active ? 'text-white/80' : 'text-muted-foreground'}`}>
                {locked ? (itineraryLoading ? 'Loading…' : 'Needs itinerary') : tab.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
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
    </div>
  );
}
