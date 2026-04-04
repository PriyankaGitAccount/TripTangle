'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMapsLibrary,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { toast } from 'sonner';
import { useRealtimePins } from '@/hooks/use-realtime-pins';
import type { MapPin, Member, PinCategory, ItineraryData, ItineraryDay } from '@/types';

/* ─── Constants ─── */

const MY_COLOR = '#EA580C';
const OTHER_COLORS = ['#DC2626', '#16A34A', '#D97706', '#9B59B6', '#0D9488'];
const ITINERARY_COLOR = '#16A34A';

const CATEGORY_EMOJI: Record<PinCategory, string> = {
  accommodation: '🏨',
  restaurant: '🍽️',
  activity: '🎯',
  other: '📍',
};

const ITINERARY_CATEGORY_EMOJI: Record<string, string> = {
  accommodation: '🏨',
  restaurant: '🍽️',
  activity: '🎯',
  transport: '🚗',
};

/* ─── Pin shape component ─── */

function MapPinShape({ color, emoji, size = 'md' }: { color: string; emoji: string; size?: 'sm' | 'md' }) {
  const circle = size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs';
  return (
    <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform drop-shadow-md">
      <div
        className={`${circle} rounded-full flex items-center justify-center text-white border-2 border-white shadow-md`}
        style={{ backgroundColor: color }}
      >
        {emoji}
      </div>
      <div
        className="w-0 h-0 -mt-px"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `7px solid ${color}`,
        }}
      />
    </div>
  );
}

/* ─── Types ─── */

interface GeocodedPlace {
  place_name: string;
  category: string;
  day: number;
  date: string;
  lat: number;
  lng: number;
}

/* ─── Helpers ─── */

function getMemberColor(memberId: string, members: Member[], currentMemberId: string | null) {
  if (memberId === currentMemberId) return MY_COLOR;
  const others = members.filter((m) => m.id !== currentMemberId);
  const idx = others.findIndex((m) => m.id === memberId);
  return OTHER_COLORS[idx % OTHER_COLORS.length] ?? OTHER_COLORS[0];
}

/* ─── Add pin form ─── */

interface AddPinFormProps {
  onSave: (title: string, category: PinCategory, note: string) => void;
  onCancel: () => void;
}

function AddPinForm({ onSave, onCancel }: AddPinFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PinCategory>('activity');
  const [note, setNote] = useState('');

  return (
    <div className="rounded-2xl bg-card p-4 space-y-3 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Add Pin
      </p>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Pin title (e.g. Our hotel)"
        maxLength={100}
        className="w-full rounded-lg bg-background shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright"
      />
      <div className="grid grid-cols-2 gap-2">
        {(['accommodation', 'restaurant', 'activity', 'other'] as PinCategory[]).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              category === c
                ? 'bg-brand-bright text-white shadow-md'
                : 'bg-muted/30 text-muted-foreground shadow-sm hover:shadow-md'
            }`}
          >
            {CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        maxLength={300}
        className="w-full rounded-lg bg-background shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright"
      />
      <div className="flex gap-2">
        <button
          onClick={() => title.trim() && onSave(title.trim(), category, note.trim())}
          disabled={!title.trim()}
          className="flex-1 rounded-xl bg-brand-bright py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-brand-bright/90 transition-colors"
        >
          Add Pin
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl bg-muted/30 shadow-sm px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Itinerary pins — geocodes place names inside APIProvider context ─── */

function ItineraryPins({
  days,
  destination,
  selectedPlace,
  onSelect,
  onPlacesReady,
}: {
  days: ItineraryDay[];
  destination: string;
  selectedPlace: GeocodedPlace | null;
  onSelect: (p: GeocodedPlace | null) => void;
  onPlacesReady: (places: GeocodedPlace[]) => void;
}) {
  const geocodingLib = useMapsLibrary('geocoding');

  useEffect(() => {
    if (!geocodingLib || !days.length) return;

    const geocoder = new geocodingLib.Geocoder();

    // Collect unique place names, preserve first occurrence metadata
    const seen = new Map<string, { category: string; day: number; date: string }>();
    for (const day of days) {
      for (const act of day.activities) {
        if (!seen.has(act.place_name)) {
          seen.set(act.place_name, { category: act.category, day: day.day, date: day.date });
        }
      }
    }

    Promise.all(
      [...seen.entries()].map(async ([place_name, meta]) => {
        try {
          const res = await geocoder.geocode({ address: `${place_name}, ${destination}` });
          const loc = res.results[0]?.geometry?.location;
          if (!loc) return null;
          return { place_name, ...meta, lat: loc.lat(), lng: loc.lng() } as GeocodedPlace;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      onPlacesReady(results.filter((p): p is GeocodedPlace => p !== null));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocodingLib]);

  return null; // markers rendered by parent after places are ready
}

/* ─── Main component ─── */

interface SharedMapProps {
  tripId: string;
  currentMemberId: string | null;
  members: Member[];
  initialPins: MapPin[];
  defaultLat?: number;
  defaultLng?: number;
  itinerary?: ItineraryData;
}

export function SharedMap({
  tripId,
  currentMemberId,
  members,
  initialPins,
  defaultLat = 20,
  defaultLng = 0,
  itinerary,
}: SharedMapProps) {
  const { pins, setPins } = useRealtimePins(tripId, initialPins);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [selectedItineraryPlace, setSelectedItineraryPlace] = useState<GeocodedPlace | null>(null);
  const [itineraryPlaces, setItineraryPlaces] = useState<GeocodedPlace[]>([]);
  const [saving, setSaving] = useState(false);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!e.detail.latLng || !currentMemberId) return;
      setPendingLatLng({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
      setSelectedPin(null);
      setSelectedItineraryPlace(null);
    },
    [currentMemberId]
  );

  async function savePin(title: string, category: PinCategory, note: string) {
    if (!pendingLatLng || !currentMemberId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentMemberId,
          lat: pendingLatLng.lat,
          lng: pendingLatLng.lng,
          title,
          category,
          note,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Pin added');
    } catch {
      toast.error('Failed to add pin');
    } finally {
      setSaving(false);
      setPendingLatLng(null);
    }
  }

  async function deletePin(pin: MapPin) {
    try {
      await fetch(`/api/trips/${tripId}/pins`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: pin.id, member_id: currentMemberId }),
      });
      setPins((prev) => prev.filter((p) => p.id !== pin.id));
      setSelectedPin(null);
      toast.success('Pin removed');
    } catch {
      toast.error('Failed to remove pin');
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="rounded-2xl bg-muted/20 shadow-inner py-14 text-center space-y-2">
        <div className="text-4xl">🗺️</div>
        <p className="text-sm font-semibold text-foreground">Google Maps not configured</p>
        <p className="text-xs text-muted-foreground">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
        </p>
      </div>
    );
  }

  const mapCenter =
    defaultLat !== 20 ? { lat: defaultLat, lng: defaultLng } : { lat: 20, lng: 0 };
  const defaultZoom = defaultLat !== 20 ? 12 : 2;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: getMemberColor(m.id, members, currentMemberId) }}
            />
            <span className="text-xs text-muted-foreground">
              {m.id === currentMemberId ? 'You' : m.display_name}
            </span>
          </div>
        ))}
        {itinerary && (
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: ITINERARY_COLOR }}
            />
            <span className="text-xs text-muted-foreground">Itinerary (green)</span>
          </div>
        )}
        {currentMemberId && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            Tap the map to add a pin
          </span>
        )}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{ height: 420 }}>
        <APIProvider apiKey={apiKey}>
          {/* Geocode itinerary places inside APIProvider context */}
          {itinerary && (
            <ItineraryPins
              days={itinerary.days}
              destination={itinerary.destination}
              selectedPlace={selectedItineraryPlace}
              onSelect={(p) => {
                setSelectedItineraryPlace(p);
                setSelectedPin(null);
                setPendingLatLng(null);
              }}
              onPlacesReady={setItineraryPlaces}
            />
          )}

          <GoogleMap
            defaultCenter={mapCenter}
            defaultZoom={defaultZoom}
            mapId="triptangle-shared-map"
            onClick={handleMapClick}
            gestureHandling="greedy"
          >
            {/* Itinerary place markers */}
            {itineraryPlaces.map((place) => (
              <AdvancedMarker
                key={place.place_name}
                position={{ lat: place.lat, lng: place.lng }}
                title={place.place_name}
                onClick={() => {
                  setSelectedItineraryPlace(
                    place === selectedItineraryPlace ? null : place
                  );
                  setSelectedPin(null);
                  setPendingLatLng(null);
                }}
              >
                <MapPinShape
                  color={ITINERARY_COLOR}
                  emoji={ITINERARY_CATEGORY_EMOJI[place.category] ?? '📍'}
                />
              </AdvancedMarker>
            ))}

            {/* Member-added pins */}
            {pins.map((pin) => (
              <AdvancedMarker
                key={pin.id}
                position={{ lat: pin.lat, lng: pin.lng }}
                title={pin.title}
                onClick={() => {
                  setSelectedPin(pin === selectedPin ? null : pin);
                  setSelectedItineraryPlace(null);
                  setPendingLatLng(null);
                }}
              >
                <MapPinShape
                  color={getMemberColor(pin.member_id, members, currentMemberId)}
                  emoji={CATEGORY_EMOJI[pin.category]}
                />
              </AdvancedMarker>
            ))}
          </GoogleMap>
        </APIProvider>
      </div>

      {/* Add pin form */}
      {pendingLatLng && !saving && (
        <AddPinForm onSave={savePin} onCancel={() => setPendingLatLng(null)} />
      )}

      {/* Selected itinerary place info */}
      {selectedItineraryPlace && !pendingLatLng && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">
                {ITINERARY_CATEGORY_EMOJI[selectedItineraryPlace.category] ?? '📍'}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedItineraryPlace.place_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Day {selectedItineraryPlace.day} · {selectedItineraryPlace.date}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedItineraryPlace(null)}
              className="rounded-lg bg-white/70 shadow-sm px-3 py-1.5 text-xs text-muted-foreground hover:bg-white transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-amber-700/70 pl-8">From the AI itinerary</p>
        </div>
      )}

      {/* Selected user pin info */}
      {selectedPin && !pendingLatLng && (
        <div className="rounded-2xl bg-card shadow-md p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span>{CATEGORY_EMOJI[selectedPin.category]}</span>
                <p className="text-sm font-semibold text-foreground">{selectedPin.title}</p>
              </div>
              {selectedPin.note && (
                <p className="text-xs text-muted-foreground mt-0.5">{selectedPin.note}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Added by{' '}
                <span className="font-medium">
                  {selectedPin.member_id === currentMemberId
                    ? 'You'
                    : members.find((m) => m.id === selectedPin.member_id)?.display_name ??
                      'Someone'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedPin.member_id === currentMemberId && (
                <button
                  onClick={() => deletePin(selectedPin)}
                  className="rounded-lg bg-red-50 shadow-sm px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => setSelectedPin(null)}
                className="rounded-lg bg-muted/30 shadow-sm px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Itinerary places list */}
      {itineraryPlaces.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Itinerary Places ({itineraryPlaces.length})
          </p>
          <div className="space-y-1.5">
            {itineraryPlaces.map((place) => (
              <button
                key={place.place_name}
                onClick={() => {
                  setSelectedItineraryPlace(place === selectedItineraryPlace ? null : place);
                  setSelectedPin(null);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  selectedItineraryPlace === place
                    ? 'bg-amber-50 border border-amber-200 shadow-sm'
                    : 'bg-card shadow-sm hover:shadow-md'
                }`}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ITINERARY_COLOR }}
                />
                <span className="text-sm">
                  {ITINERARY_CATEGORY_EMOJI[place.category] ?? '📍'}
                </span>
                <span className="text-sm font-medium text-foreground truncate">
                  {place.place_name}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                  Day {place.day}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Member pins list */}
      {pins.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Member Pins ({pins.length})
          </p>
          <div className="space-y-1.5">
            {pins.map((pin) => (
              <button
                key={pin.id}
                onClick={() => {
                  setSelectedPin(pin === selectedPin ? null : pin);
                  setSelectedItineraryPlace(null);
                }}
                className="w-full flex items-center gap-3 rounded-xl bg-card shadow-sm px-3 py-2.5 text-left hover:shadow-md transition-all"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getMemberColor(pin.member_id, members, currentMemberId) }}
                />
                <span className="text-sm">{CATEGORY_EMOJI[pin.category]}</span>
                <span className="text-sm font-medium text-foreground truncate">{pin.title}</span>
                <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                  {pin.member_id === currentMemberId
                    ? 'You'
                    : members.find((m) => m.id === pin.member_id)?.display_name ?? ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
