import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { channel } = body;

  if (!['whatsapp', 'gmail', 'sms', 'copy'].includes(channel)) {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from('invitations')
    .insert({ trip_id: id, channel });

  if (error) {
    return NextResponse.json({ error: 'Failed to record invite' }, { status: 500 });
  }

  const { count } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', id);

  return NextResponse.json({ invited_count: count ?? 0 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { count } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', id);

  return NextResponse.json({ invited_count: count ?? 0 });
}
