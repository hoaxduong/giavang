import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { moderateCommentSchema } from "@/lib/blog/validations";
import { dbCommentToComment } from "@/lib/blog/types";

/**
 * POST /api/admin/blog/comments/[id]/moderate
 * Moderate a comment (approve, reject, or mark as spam)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = moderateCommentSchema.parse({ ...body, id });

    const { data, error } = await supabase
      .from("blog_comments")
      .update({
        status: validated.status,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ comment: dbCommentToComment(data) });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unauthorized or invalid request" },
      { status: 401 },
    );
  }
}
