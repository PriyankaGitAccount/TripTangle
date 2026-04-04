import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expenses: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { paid_by_member_id, amount, description, category, split_among } = body;

  if (!paid_by_member_id || !amount || !description || !category || !Array.isArray(split_among)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (split_among.length === 0) {
    return NextResponse.json({ error: 'Must split with at least one person' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('expenses')
    .insert({ trip_id: id, paid_by_member_id, amount, description, category, split_among })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expense: data }, { status: 201 });
}
