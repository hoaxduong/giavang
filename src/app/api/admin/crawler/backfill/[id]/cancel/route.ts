import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { BackfillManager } from "@/lib/api/backfill/backfill-manager";

/**
 * POST /api/admin/crawler/backfill/[id]/cancel
 * Cancel a job
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await requireRole("admin");

    const manager = new BackfillManager();
    await manager.cancelJob(params.id);

    return NextResponse.json(
      { message: "Job cancelled successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      `POST /api/admin/crawler/backfill/${params.id}/cancel error:`,
      error,
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel job",
      },
      { status: 500 },
    );
  }
}
