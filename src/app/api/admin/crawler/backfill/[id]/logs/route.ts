import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { dbLogToLog } from "@/lib/api/backfill/types";
import type { DbBackfillJobLog } from "@/lib/api/backfill/types";

/**
 * GET /api/admin/crawler/backfill/[id]/logs
 * Get logs for a specific job
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await requireRole("admin");

    const { searchParams } = new URL(request.url);
    const logLevel = searchParams.get("logLevel") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("backfill_job_logs")
      .select("*")
      .eq("job_id", params.id)
      .order("created_at", { ascending: false });

    if (logLevel) {
      query = query.eq("log_level", logLevel);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch logs: ${error.message}`);
    }

    const logs = (data as DbBackfillJobLog[]).map(dbLogToLog);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error(
      `GET /api/admin/crawler/backfill/${params.id}/logs error:`,
      error,
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch logs",
      },
      { status: 500 },
    );
  }
}
