import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BUCKET = 'trip-photos';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { photoId } = await params;
  const { member_id } = await req.json();

  if (!member_id) return NextResponse.json({ error: 'member_id required' }, { status: 400 });

  const supabase = createServerClient();
  const { data: photo } = await supabase
    .from('trip_photos')
    .select('member_id, file_path')
    .eq('id', photoId)
    .single();

  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (photo.member_id !== member_id) {
    return NextResponse.json({ error: 'Only the uploader can delete this photo' }, { status: 403 });
  }

  const admin = adminClient();
  await admin.storage.from(BUCKET).remove([photo.file_path]);

  const { error } = await supabase.from('trip_photos').delete().eq('id', photoId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
