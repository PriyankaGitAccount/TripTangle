'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MAX_DATE_RANGE_DAYS } from '@/lib/constants';
import { daysBetween } from '@/lib/trip-utils';

/* ─── City autocomplete input ─── */

interface Suggestion {
  placeId: string;
  description: string;
  mainText: string;
}

function DestinationInput({ value, onChange }: {
  value: string;
  onChange: (val: string) => void;
}) {
  const places = useMapsLibrary('places');
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (places) serviceRef.current = new places.AutocompleteService();
  }, [places]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setSelected(false);
    onChange(v);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim() || !serviceRef.current) { setSuggestions([]); setOpen(false); return; }

    debounceRef.current = setTimeout(() => {
      serviceRef.current!.getPlacePredictions(
        { input: v, types: ['(cities)'] },
        (preds, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
            setSuggestions(preds.map((p) => ({
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting.main_text,
            })));
            setOpen(true);
          } else {
            setSuggestions([]);
            setOpen(false);
          }
        }
      );
    }, 300);
  }

  function handleSelect(s: Suggestion) {
    setQuery(s.description);
    onChange(s.description);
    setSelected(true);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Paris, Bali, New York…"
        required
        maxLength={100}
        className="h-12"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-light transition-colors flex items-center gap-2"
              >
                <span className="text-base">📍</span>
                <div>
                  <p className="font-semibold text-foreground">{s.mainText}</p>
                  <p className="text-[11px] text-muted-foreground">{s.description}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Main form ─── */

export function CreateTripForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [dateStart, setDateStart] = useState(todayStr);
  const [dateEnd, setDateEnd] = useState('');
  const [dateEndError, setDateEndError] = useState('');

  function handleStartChange(val: string) {
    setDateStart(val);
    if (dateEnd && dateEnd < val) {
      setDateEndError('End date cannot be before start date');
    } else {
      setDateEndError('');
    }
  }

  function handleEndChange(val: string) {
    setDateEnd(val);
    if (val && val < dateStart) {
      setDateEndError('End date cannot be before start date');
    } else {
      setDateEndError('');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string).trim();
    const dest = destination.trim();
    const description = (form.get('description') as string).trim();
    const displayName = (form.get('displayName') as string).trim();

    if (!name || !dest || !dateStart || !dateEnd || !displayName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!dateEnd) {
      toast.error('Please select an end date');
      return;
    }

    if (dateEnd < dateStart) {
      toast.error('End date cannot be before start date');
      return;
    }

    if (daysBetween(dateStart, dateEnd) > MAX_DATE_RANGE_DAYS) {
      toast.error(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          destination: dest,
          description,
          date_range_start: dateStart,
          date_range_end: dateEnd,
          display_name: displayName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create trip');
      }

      const { trip_id, member_id } = await res.json();

      // Store identity in localStorage
      try {
        localStorage.setItem(
          `triptangle_member_${trip_id}`,
          JSON.stringify({ memberId: member_id, displayName })
        );
      } catch {
        // localStorage unavailable
      }

      router.push(`/trip/${trip_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Trip Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Summer Beach Trip"
          required
          maxLength={100}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="destination">Destination *</Label>
        <DestinationInput value={destination} onChange={setDestination} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="A weekend getaway with friends..."
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateStart">Start Date *</Label>
          <Input
            id="dateStart"
            name="dateStart"
            type="date"
            required
            value={dateStart}
            min={todayStr}
            onChange={(e) => handleStartChange(e.target.value)}
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateEnd">End Date *</Label>
          <Input
            id="dateEnd"
            name="dateEnd"
            type="date"
            required
            value={dateEnd}
            min={dateStart}
            onChange={(e) => handleEndChange(e.target.value)}
            className={`h-12 ${dateEndError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          />
          {dateEndError && (
            <p className="text-xs text-red-500">{dateEndError}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Your Name *</Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder="What should we call you?"
          required
          maxLength={50}
          className="h-12"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-14 w-full rounded-2xl text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #EA580C 0%, #D97706 100%)',
          boxShadow: '0 4px 20px rgba(234,88,12,0.25)',
        }}
      >
        {loading ? 'Creating...' : 'Create Trip'}
      </button>
    </form>
    </APIProvider>
  );
}
