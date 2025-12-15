import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ automations: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    const body = await req.json();

    // Validate basic fields: name, type, schedule
    if (!body.name || !body.type || !body.schedule) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("automations")
      .insert({ ...body, next_run_at: new Date() }) // temporary next_run, scheduler will update
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ automation: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
