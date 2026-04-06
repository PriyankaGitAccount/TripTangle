'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Itinerary, ItineraryActivity, ItinerarySuggestion, Member } from '@/types';

const CATEGORY_ICON: Record<ItineraryActivity['category'], string> = {
  accommodation: '🏨',
  restaurant: '🍽️',
  activity: '🎯',
  transport: '🚆',
};

const TIME_COLOR: Record<string, string> = {
  Morning: 'bg-amber-400',
  Afternoon: 'bg-sky-400',
  Evening: 'bg-violet-400',
};

const LOADING_MESSAGES = [
  'Scouting hidden gems…',
  'Checking what\'s in season…',
  'Finding the best local spots…',
  'Plotting the perfect route…',
  'Asking the locals…',
  'Sourcing off-the-beaten-path picks…',
  'Matching vibes to weather…',
  'Curating day-by-day experiences…',
];

// ── Brand icons ──────────────────────────────────────────────────
function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" fill="#FF0000"/>
      <path d="M9.75 15.02l5.75-3.02-5.75-3.02v6.04z" fill="#fff"/>
    </svg>
  );
}

function TripAdvisorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#34E0A1"/>
      <circle cx="8.5" cy="11" r="2.5" fill="white"/>
      <circle cx="15.5" cy="11" r="2.5" fill="white"/>
      <circle cx="8.5" cy="11" r="1" fill="#00AA6C"/>
      <circle cx="15.5" cy="11" r="1" fill="#00AA6C"/>
      <path d="M9.5 15c.5 1 4.5 1 5 0" stroke="#00AA6C" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

// ── URL helpers ──────────────────────────────────────────────────
function youtubeUrl(q: string) { return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`; }
function tripadvisorUrl(q: string) { return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(q)}`; }
function bookingUrl(d: string) { return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(d)}`; }
function trivagoUrl(d: string) { return `https://www.trivago.com/en-GB/srl?search=200-${encodeURIComponent(d)}`; }
function googleMapsUrl(place: string, dest: string) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place} ${dest}`)}`; }
function googleSearchUrl(place: string, dest: string) { return `https://www.google.com/search?q=${encodeURIComponent(`${place} ${dest} reviews photos`)}`; }
function googleBlogUrl(q: string) { return `https://www.google.com/search?q=${encodeURIComponent(q + ' travel guide blog')}`; }
function mapsEmbedUrl(place: string, dest: string, key: string) { return `https://www.google.com/maps/embed/v1/search?key=${key}&q=${encodeURIComponent(`${place} ${dest}`)}`; }

// ── Loading state ────────────────────────────────────────────────
function LoadingState({ destination }: { destination: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    const progTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 1.2, 92));
    }, 1000);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 space-y-8">
      {/* Animated globe */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-24 w-24 rounded-full border-4 border-brand-bright/20 animate-ping" />
        <div className="absolute h-16 w-16 rounded-full border-2 border-brand-bright/30 animate-pulse" />
        <div className="text-5xl animate-bounce">✈️</div>
      </div>

      {/* Destination */}
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Building your itinerary for
        </p>
        <p className="text-2xl font-bold text-brand-deep">{destination || 'your destination'}</p>
      </div>

      {/* Rotating message */}
      <div className="h-6 overflow-hidden">
        <p
          key={msgIdx}
          className="text-sm text-muted-foreground text-center animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          {LOADING_MESSAGES[msgIdx]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-bright to-brand-green transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">This takes about 30 seconds</p>
      </div>
    </div>
  );
}

// ── Activity card ────────────────────────────────────────────────
function ActivityRow({
  act,
  destination,
  apiKey,
  isLast,
}: {
  act: ItineraryActivity;
  destination: string;
  apiKey: string;
  isLast: boolean;
}) {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <div className={`flex gap-3 py-4 ${!isLast ? 'border-b border-border/60' : ''}`}>
      {/* Time indicator */}
      <div className="flex flex-col items-center gap-1 pt-0.5 w-16 shrink-0">
        <div className={`h-2 w-2 rounded-full ${TIME_COLOR[act.time] ?? 'bg-muted-foreground'}`} />
        <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">{act.time}</span>
        <span className="text-lg">{CATEGORY_ICON[act.category]}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-bold text-foreground leading-snug">{act.title}</p>
        <p className="text-[11px] text-brand-bright font-medium">{act.place_name}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{act.description}</p>

        {/* Action chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <a href={googleMapsUrl(act.place_name, destination)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-semibold text-brand-deep hover:bg-brand-bright hover:text-white transition-colors">
            📍 Maps
          </a>
          <a href={googleSearchUrl(act.place_name, destination)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            🔍 Reviews
          </a>
          <a href={youtubeUrl(`${act.place_name} ${destination}`)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition-colors">
            <YouTubeIcon className="h-3 w-3" /> YouTube
          </a>
          <a href={tripadvisorUrl(`${act.place_name} ${destination}`)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100 transition-colors">
            <TripAdvisorIcon className="h-3 w-3" /> TripAdvisor
          </a>
          {apiKey && (
            <button onClick={() => setShowEmbed((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-700 hover:bg-sky-100 transition-colors">
              🗺️ {showEmbed ? 'Hide' : 'Preview'}
            </button>
          )}
        </div>

        {showEmbed && apiKey && (
          <div className="rounded-xl overflow-hidden shadow-md mt-2" style={{ height: 200 }}>
            <iframe src={mapsEmbedUrl(act.place_name, destination, apiKey)}
              width="100%" height="200" style={{ border: 0 }} loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title={act.place_name} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Day card on timeline ─────────────────────────────────────────
function DayCard({
  day, date, theme, activities, destination, apiKey, isLast,
}: {
  day: number; date: string; theme: string; activities: ItineraryActivity[];
  destination: string; apiKey: string; isLast: boolean;
}) {
  const [open, setOpen] = useState(day === 1);

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-bright text-white text-xs font-bold shadow-lg hover:bg-brand-deep transition-colors z-10"
        >
          {day}
        </button>
        {!isLast && <div className="w-0.5 flex-1 bg-gradient-to-b from-brand-bright/40 to-brand-bright/10 mt-1 min-h-[2rem]" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6">
        {/* Day header — always visible */}
        <button onClick={() => setOpen((v) => !v)} className="w-full text-left mb-3 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground group-hover:text-brand-bright transition-colors">{theme}</p>
              <p className="text-[11px] text-muted-foreground">{date}</p>
            </div>
            <span className="text-xs text-muted-foreground transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
          </div>
        </button>

        {/* Activities — collapsible */}
        {open && (
          <div className="rounded-2xl bg-card shadow-md overflow-hidden">
            {activities.map((act, i) => (
              <ActivityRow
                key={i}
                act={act}
                destination={destination}
                apiKey={apiKey}
                isLast={i === activities.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Suggestions section ──────────────────────────────────────────
function SuggestionsSection({
  tripId, currentMemberId, members, suggestions, onAdd, onDelete,
}: {
  tripId: string; currentMemberId: string | null; members: Member[];
  suggestions: ItinerarySuggestion[];
  onAdd: (s: ItinerarySuggestion) => void; onDelete: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function addSuggestion() {
    if (!text.trim() || !currentMemberId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: currentMemberId, suggestion: text.trim() }),
      });
      if (!res.ok) throw new Error();
      const { suggestion } = await res.json();
      onAdd(suggestion);
      setText('');
      toast.success('Suggestion added');
    } catch { toast.error('Failed to save suggestion'); }
    finally { setSaving(false); }
  }

  async function deleteSuggestion(id: string) {
    try {
      await fetch(`/api/trips/${tripId}/itinerary/suggestions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion_id: id, member_id: currentMemberId }),
      });
      onDelete(id);
    } catch { toast.error('Failed to delete suggestion'); }
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-card shadow-md">
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3">
        <h3 className="text-sm font-bold text-white">🎯 Group Preferences</h3>
        <p className="text-[10px] text-violet-100 mt-0.5">Add what your group loves — used when regenerating the itinerary</p>
      </div>
      <div className="p-5 space-y-4">

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => {
            const isOwner = s.member_id === currentMemberId;
            const author = members.find((m) => m.id === s.member_id);
            return (
              <div key={s.id}
                className="flex items-center gap-1.5 rounded-full bg-muted/40 shadow-sm pl-3 pr-2 py-1.5">
                <span className="text-xs text-foreground">{s.suggestion}</span>
                <span className="text-[10px] text-muted-foreground">· {isOwner ? 'You' : author?.display_name ?? 'Someone'}</span>
                {isOwner && (
                  <button onClick={() => deleteSuggestion(s.id)}
                    className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors text-xs">✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {currentMemberId && (
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addSuggestion()}
            placeholder="e.g. We love street food, avoid tourist traps…"
            maxLength={500}
            className="flex-1 rounded-xl bg-background shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright" />
          <button onClick={addSuggestion} disabled={saving || !text.trim()}
            className="rounded-xl bg-brand-bright px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-brand-bright/90 transition-colors">
            Add
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────
interface ItineraryBuilderProps {
  tripId: string;
  destination: string;
  lockedStart?: string | null;
  lockedEnd?: string | null;
  currentMemberId: string | null;
  members: Member[];
  itinerary: Itinerary | null;
  initialSuggestions: ItinerarySuggestion[];
  onItineraryChange: (itinerary: Itinerary) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function ItineraryBuilder({
  tripId, destination, lockedStart, lockedEnd,
  currentMemberId, members, itinerary, initialSuggestions, onItineraryChange, onLoadingChange,
}: ItineraryBuilderProps) {
  const [suggestions, setSuggestions] = useState<ItinerarySuggestion[]>(initialSuggestions);
  const [loading, setLoading] = useState(false);
  const hasAutoGenerated = useRef(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const data = itinerary?.itinerary_json;

  useEffect(() => {
    if (!itinerary && !hasAutoGenerated.current) {
      hasAutoGenerated.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary`, { method: 'POST' });
      let body: Record<string, unknown>;
      try {
        body = await res.json();
      } catch {
        throw new Error('Itinerary generation timed out — please try again');
      }
      if (!res.ok) throw new Error((body.error as string) || 'Failed to generate');
      onItineraryChange(body.itinerary as Itinerary);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  const days = lockedStart && lockedEnd
    ? Math.round((new Date(lockedEnd + 'T00:00:00').getTime() - new Date(lockedStart + 'T00:00:00').getTime()) / 86_400_000) + 1
    : null;

  return (
    <div className="space-y-6">

      {/* ── Group Preferences — always visible so members can add before generating ── */}
      <SuggestionsSection
        tripId={tripId}
        currentMemberId={currentMemberId}
        members={members}
        suggestions={suggestions}
        onAdd={(s) => setSuggestions((prev) => [...prev, s])}
        onDelete={(id) => setSuggestions((prev) => prev.filter((s) => s.id !== id))}
      />

      {/* ── Regenerate / Re-suggest button ── */}
      {!loading && (
        <div className="flex items-center justify-between gap-2">
          {data && (
            <button onClick={generate} disabled={loading}
              className="rounded-xl bg-white shadow-sm px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:shadow-md transition-all">
              ↺ Regenerate
            </button>
          )}
          {suggestions.length > 0 && (
            <button onClick={generate} disabled={loading}
              className="ml-auto rounded-xl bg-brand-bright/10 px-4 py-2 text-xs font-bold text-brand-bright shadow-sm transition-all hover:bg-brand-bright hover:text-white hover:shadow-md active:scale-[0.98] disabled:opacity-60">
              ↺ Regenerate with {suggestions.length} preference{suggestions.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && <LoadingState destination={destination} />}

      {/* ── Itinerary content ── */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

          {/* ── LEFT — main content ── */}
          <div className="space-y-7 min-w-0">

            {/* Weather callout */}
            {data.weather_context && (
              <div className="flex gap-3 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 shadow-sm px-4 py-3">
                <span className="text-xl shrink-0">🌤️</span>
                <div>
                  <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wide">{data.season}</p>
                  <p className="text-xs text-sky-700 mt-0.5 leading-relaxed">{data.weather_context}</p>
                </div>
              </div>
            )}

            {/* Summary */}
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-brand-bright/40 pl-4 italic">
              {data.summary}
            </p>

            {/* Quick booking strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { label: '🏨 Booking.com', href: bookingUrl(destination), cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm' },
                { label: '🔍 Trivago',     href: trivagoUrl(destination), cls: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm' },
                { label: '📰 Blogs',       href: googleBlogUrl(destination), cls: 'bg-orange-50 text-orange-700 hover:bg-orange-100 shadow-sm' },
              ].map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${link.cls}`}>
                  {link.label}
                </a>
              ))}
              <a href={tripadvisorUrl(destination)} target="_blank" rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-700 hover:bg-green-100 transition-colors whitespace-nowrap shadow-sm">
                <TripAdvisorIcon className="h-3.5 w-3.5" /> TripAdvisor
              </a>
              <a href={youtubeUrl(`${destination} travel vlog`)} target="_blank" rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap shadow-sm">
                <YouTubeIcon className="h-3.5 w-3.5" /> Vlogs
              </a>
            </div>

            {/* Day timeline */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Your Journey</p>
              <div>
                {data.days.map((day, i) => (
                  <DayCard
                    key={day.day}
                    day={day.day}
                    date={day.date}
                    theme={day.theme}
                    activities={day.activities}
                    destination={data.destination}
                    apiKey={apiKey}
                    isLast={i === data.days.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT — sidebar ── */}
          <div className="lg:sticky lg:top-4 space-y-5">

            {/* Local Tips */}
            <div className="rounded-2xl overflow-hidden bg-card shadow-md">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                <p className="text-sm font-bold text-white">📌 Local Tips</p>
                <p className="text-[10px] text-emerald-100 mt-0.5">Insider knowledge for your trip</p>
              </div>
              <ul className="p-4 space-y-3">
                {data.tips.slice(0, 6).map((tip, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 text-emerald-500 shrink-0 font-bold text-sm">✓</span>
                    <p className="text-xs text-foreground leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Watch & Read */}
            <div className="rounded-2xl overflow-hidden bg-card shadow-md">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3">
                <p className="text-sm font-bold text-white">🎬 Watch &amp; Read</p>
                <p className="text-[10px] text-red-100 mt-0.5">Top picks to inspire your trip</p>
              </div>
              <ul className="p-4 space-y-3">
                {data.search_queries.slice(0, 5).map((q, i) => (
                  <li key={i} className="flex items-start justify-between gap-2">
                    <p className="text-[11px] text-foreground leading-snug line-clamp-2 flex-1">{q}</p>
                    <div className="flex gap-1 shrink-0">
                      <a href={youtubeUrl(q)} target="_blank" rel="noopener noreferrer"
                        className="rounded-full bg-red-50 p-1 hover:bg-red-100 transition-colors flex items-center justify-center">
                        <YouTubeIcon className="h-3.5 w-3.5" />
                      </a>
                      <a href={tripadvisorUrl(q)} target="_blank" rel="noopener noreferrer"
                        className="rounded-full bg-green-50 p-1 hover:bg-green-100 transition-colors flex items-center justify-center">
                        <TripAdvisorIcon className="h-3.5 w-3.5" />
                      </a>
                      <a href={googleBlogUrl(q)} target="_blank" rel="noopener noreferrer"
                        className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-700 hover:bg-orange-100 transition-colors">📰</a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
