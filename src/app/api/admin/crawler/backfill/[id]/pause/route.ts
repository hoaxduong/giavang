import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { BackfillManager } from "@/lib/api/backfill/backfill-manager";

/**
 * POST /api/admin/crawler/backfill/[id]/pause
 * Pause a running job
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await requireRole("admin");

    const manager = new BackfillManager();
    await manager.pauseJob(params.id);

    return NextResponse.json(
      { message: "Job paused successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      `POST /api/admin/crawler/backfill/${params.id}/pause error:`,
      error,
    );

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pause job" },
      { status: 500 },
    );
  }
}
