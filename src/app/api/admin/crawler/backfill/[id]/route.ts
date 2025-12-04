import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { BackfillManager } from "@/lib/api/backfill/backfill-manager";

/**
 * GET /api/admin/crawler/backfill/[id]
 * Get specific job details
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await requireRole("admin");

    const manager = new BackfillManager();
    const job = await manager.getJob(params.id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error(`GET /api/admin/crawler/backfill/${params.id} error:`, error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch job" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/crawler/backfill/[id]
 * Delete a job (only if completed/failed/cancelled)
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await requireRole("admin");

    const manager = new BackfillManager();
    await manager.deleteJob(params.id);

    return NextResponse.json(
      { message: "Job deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      `DELETE /api/admin/crawler/backfill/${params.id} error:`,
      error,
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete job",
      },
      { status: 500 },
    );
  }
}
