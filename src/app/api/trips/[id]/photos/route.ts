import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BUCKET = 'trip-photos';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('trip_photos')
    .select('*')
    .eq('trip_id', id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photos: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const memberId = formData.get('member_id') as string | null;

  if (!file || !memberId) {
    return NextResponse.json({ error: 'file and member_id are required' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${id}/${memberId}/${Date.now()}-${safeName}`;

  const admin = adminClient();
  const { error: storageError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const supabase = createServerClient();
  const { data, error: dbError } = await supabase
    .from('trip_photos')
    .insert({
      trip_id: id,
      member_id: memberId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      content_type: file.type,
    })
    .select()
    .single();

  if (dbError) {
    await admin.storage.from(BUCKET).remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ photo: data }, { status: 201 });
}
