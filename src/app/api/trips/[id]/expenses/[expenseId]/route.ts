import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const { expenseId } = await params;
  const body = await req.json();
  const { member_id } = body;

  if (!member_id) return NextResponse.json({ error: 'member_id required' }, { status: 400 });

  const supabase = createServerClient();

  // Verify ownership — only the payer can delete
  const { data: expense } = await supabase
    .from('expenses')
    .select('paid_by_member_id')
    .eq('id', expenseId)
    .single();

  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (expense.paid_by_member_id !== member_id) {
    return NextResponse.json({ error: 'Only the payer can delete this expense' }, { status: 403 });
  }

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
