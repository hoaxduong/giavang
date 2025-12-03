import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { BackfillManager } from "@/lib/api/backfill/backfill-manager";
import { BackfillExecutor } from "@/lib/api/backfill/backfill-executor";

/**
 * POST /api/admin/crawler/backfill/[id]/resume
 * Resume a paused job
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await requireRole("admin");

    const manager = new BackfillManager();
    await manager.resumeJob(params.id);

    // Execute in background
    const executor = new BackfillExecutor(params.id);
    executor.execute().catch((error) => {
      console.error(`Background execution error for job ${params.id}:`, error);
    });

    return NextResponse.json(
      { message: "Job resumed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `POST /api/admin/crawler/backfill/${params.id}/resume error:`,
      error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to resume job",
      },
      { status: 500 }
    );
  }
}
