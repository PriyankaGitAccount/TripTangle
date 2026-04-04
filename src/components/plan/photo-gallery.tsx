'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useRealtimePhotos } from '@/hooks/use-realtime-photos';
import type { TripPhoto, Member } from '@/types';

const BUCKET = 'trip-photos';
const MAX_SIZE_MB = 10;
const MEMBER_COLORS = ['#EA580C', '#DC2626', '#16A34A', '#D97706', '#9B59B6', '#0D9488', '#2980B9'];

function photoUrl(filePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
}

function memberColor(idx: number) {
  return MEMBER_COLORS[idx % MEMBER_COLORS.length];
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ─── Lightbox ─── */

function Lightbox({ photo, members, currentMemberId, onClose, onDelete }: {
  photo: TripPhoto;
  members: Member[];
  currentMemberId: string | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const url = photoUrl(photo.file_path);
  const uploader = members.find((m) => m.id === photo.member_id);
  const uploaderName = photo.member_id === currentMemberId ? 'You' : (uploader?.display_name ?? 'Someone');
  const isOwner = photo.member_id === currentMemberId;

  async function download() {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = photo.file_name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Download failed');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full rounded-2xl overflow-hidden bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={photo.file_name}
          className="w-full max-h-[65vh] object-contain bg-black"
        />

        {/* Info bar */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{photo.file_name}</p>
            <p className="text-[11px] text-muted-foreground">
              {uploaderName} · {formatDate(photo.created_at)} · {formatBytes(photo.file_size)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={download}
              className="rounded-xl bg-brand-bright px-3 py-2 text-xs font-bold text-white hover:bg-brand-bright/90 transition-colors"
            >
              ↓ Download
            </button>
            {isOwner && (
              <button
                onClick={() => { onDelete(photo.id); onClose(); }}
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl bg-muted/40 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Photo card ─── */

function PhotoCard({ photo, members, currentMemberId, onClick }: {
  photo: TripPhoto;
  members: Member[];
  currentMemberId: string | null;
  onClick: () => void;
}) {
  const url = photoUrl(photo.file_path);
  const uploaderIdx = members.findIndex((m) => m.id === photo.member_id);
  const uploader = members[uploaderIdx];
  const uploaderName = photo.member_id === currentMemberId ? 'You' : (uploader?.display_name ?? '?');

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square rounded-2xl overflow-hidden bg-muted/30 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={photo.file_name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
        <span className="text-white text-xs font-semibold px-2 text-center line-clamp-2">{photo.file_name}</span>
        <span className="text-white/70 text-[10px]">Click to view</span>
      </div>
      {/* Uploader badge */}
      <div
        className="absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/50 shadow"
        style={{ backgroundColor: memberColor(uploaderIdx) }}
        title={uploaderName}
      >
        {uploaderName[0].toUpperCase()}
      </div>
    </button>
  );
}

/* ─── Upload area ─── */

function UploadArea({ onUpload, uploading }: {
  onUpload: (files: File[]) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`${f.name} exceeds ${MAX_SIZE_MB} MB`); return false; }
      return true;
    });
    if (valid.length) onUpload(valid);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-8 px-4 ${
        dragging
          ? 'border-brand-bright bg-brand-bright/5 scale-[1.01]'
          : uploading
          ? 'border-muted/40 bg-muted/10 cursor-not-allowed'
          : 'border-border/50 hover:border-brand-bright/50 hover:bg-brand-bright/5'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={uploading}
      />
      <div className="text-3xl">{uploading ? '⏳' : '📸'}</div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          {uploading ? 'Uploading…' : 'Upload photos'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {uploading ? 'Please wait' : `Drag & drop or click · up to ${MAX_SIZE_MB} MB each`}
        </p>
      </div>
    </div>
  );
}

/* ─── Main component ─── */

interface PhotoGalleryProps {
  tripId: string;
  currentMemberId: string | null;
  members: Member[];
  initialPhotos: TripPhoto[];
}

export function PhotoGallery({ tripId, currentMemberId, members, initialPhotos }: PhotoGalleryProps) {
  const { photos, setPhotos } = useRealtimePhotos(tripId, initialPhotos);
  const [activeMember, setActiveMember] = useState<string>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<TripPhoto | null>(null);
  const [uploading, setUploading] = useState(false);

  const filtered = activeMember === 'all'
    ? photos
    : photos.filter((p) => p.member_id === activeMember);

  // Per-member photo counts
  const countFor = (memberId: string) => photos.filter((p) => p.member_id === memberId).length;

  async function uploadFiles(files: File[]) {
    if (!currentMemberId) { toast.error('Join the trip first'); return; }
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('member_id', currentMemberId);
      try {
        const res = await fetch(`/api/trips/${tripId}/photos`, { method: 'POST', body: fd });
        if (!res.ok) {
          const { error } = await res.json();
          toast.error(`${file.name}: ${error}`);
        } else {
          const { photo } = await res.json();
          setPhotos((prev) => {
            if (prev.some((p) => p.id === photo.id)) return prev;
            return [photo, ...prev];
          });
          successCount++;
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    if (successCount > 0) toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded`);
  }

  async function deletePhoto(photoId: string) {
    const res = await fetch(`/api/trips/${tripId}/photos/${photoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: currentMemberId }),
    });
    if (!res.ok) { toast.error('Failed to delete photo'); return; }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    toast.success('Photo deleted');
  }

  const showUpload = currentMemberId && (activeMember === 'all' || activeMember === currentMemberId);

  return (
    <div className="space-y-5">

      {/* ── Summary ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {photos.length > 0 && (
          <button
            onClick={async () => {
              toast.info('Downloading all photos…');
              for (const photo of photos) {
                try {
                  const res = await fetch(photoUrl(photo.file_path));
                  const blob = await res.blob();
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = photo.file_name;
                  a.click();
                  URL.revokeObjectURL(a.href);
                  await new Promise((r) => setTimeout(r, 300));
                } catch { /* skip */ }
              }
            }}
            className="rounded-xl bg-brand-light px-3 py-2 text-xs font-semibold text-brand-deep hover:bg-brand-bright hover:text-white transition-colors"
          >
            ↓ Download all
          </button>
        )}
      </div>

      {/* ── Member sub-tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveMember('all')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
            activeMember === 'all'
              ? 'bg-brand-bright text-white shadow-md'
              : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Everyone ({photos.length})
        </button>
        {members.map((m, idx) => {
          const isActive = activeMember === m.id;
          const count = countFor(m.id);
          return (
            <button
              key={m.id}
              onClick={() => setActiveMember(m.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive ? 'text-white shadow-md' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
              style={isActive ? { backgroundColor: memberColor(idx) } : undefined}
            >
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isActive ? 'bg-white/20' : ''}`}
                style={!isActive ? { backgroundColor: memberColor(idx), color: 'white' } : undefined}
              >
                {m.display_name[0].toUpperCase()}
              </span>
              {m.id === currentMemberId ? 'You' : m.display_name} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Upload area (for current member's tab or "all") ── */}
      {showUpload && (
        <UploadArea onUpload={uploadFiles} uploading={uploading} />
      )}

      {/* ── Photo grid ── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              members={members}
              currentMemberId={currentMemberId}
              onClick={() => setLightboxPhoto(photo)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-14 space-y-2">
          <div className="text-4xl">🖼️</div>
          <p className="text-sm font-semibold text-foreground">No photos yet</p>
          <p className="text-xs text-muted-foreground">
            {activeMember === currentMemberId || activeMember === 'all'
              ? 'Upload your first photo above'
              : "This member hasn't uploaded any photos yet"}
          </p>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          members={members}
          currentMemberId={currentMemberId}
          onClose={() => setLightboxPhoto(null)}
          onDelete={deletePhoto}
        />
      )}
    </div>
  );
}
