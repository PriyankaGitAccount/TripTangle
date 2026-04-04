'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getShareUrl, getWhatsAppUrl } from '@/lib/trip-utils';

interface ShareDialogProps {
  tripId: string;
  tripName: string;
}

export function ShareDialog({ tripId, tripName }: ShareDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const shareUrl = getShareUrl(tripId);

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  }

  async function handleWhatsAppGeneric() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join "${tripName}" on TripTangle`,
          text: `Hey! I'm planning a trip "${tripName}" 🌴 Join our TripTangle to pick dates together:`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or browser blocked — fall through to wa.me
      }
    }
    window.open(getWhatsAppUrl(tripId, tripName), '_blank');
  }

  function handleWhatsAppDirect() {
    if (!phoneNumber.trim()) {
      toast.error('Enter a phone number');
      return;
    }
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    const text = `Hey! I'm planning a trip "${tripName}" 🌴 Join our TripTangle to pick dates together: ${shareUrl}`;
    window.open(
      `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  }

  return (
    <Dialog>
      <DialogTrigger
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white shadow-sm px-4 text-sm font-medium text-brand-bright transition-all hover:shadow-md"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Invite Friends
      </DialogTrigger>
      <DialogContent className="mx-auto max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-brand-deep">Invite Friends</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* WhatsApp - generic share */}
          <Button
            onClick={handleWhatsAppGeneric}
            className="h-14 w-full gap-3 rounded-xl bg-[#25D366] text-base font-semibold text-white hover:bg-[#25D366]/90"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Invite via WhatsApp
          </Button>

          {/* Direct WhatsApp by number */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Or send to a specific number:
            </p>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="+1 234 567 8900"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-12 flex-1"
              />
              <Button
                onClick={handleWhatsAppDirect}
                variant="outline"
                className="h-12 shrink-0 rounded-xl"
              >
                Send
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          {/* Copy link */}
          <div className="flex gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="h-12 flex-1 text-sm text-muted-foreground"
            />
            <Button
              onClick={handleCopyLink}
              variant="secondary"
              className="h-12 shrink-0 rounded-xl font-semibold"
            >
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
