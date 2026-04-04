import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { member_id, question, options, poll_date } = body;

  if (!member_id || !question?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
    return NextResponse.json({ error: 'Polls need 2–6 options' }, { status: 400 });
  }

  const cleanOptions = options.map((o: unknown) => String(o).trim()).filter(Boolean);
  if (cleanOptions.length < 2) {
    return NextResponse.json({ error: 'Options cannot be empty' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('polls')
    .insert({
      trip_id: id,
      created_by_member_id: member_id,
      question: question.trim(),
      options: cleanOptions,
      poll_date: poll_date ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
  }

  return NextResponse.json({ poll: data });
}
