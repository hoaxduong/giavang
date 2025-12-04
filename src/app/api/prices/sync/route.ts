import { NextRequest, NextResponse } from "next/server";
import { crawlerManager } from "@/lib/api/crawler/crawler-manager";
import { requireRole } from "@/lib/auth/server";

/**
 * Price Sync API Route
 *
 * This endpoint can be triggered in two ways:
 * 1. Cron job (daily at 0 UTC) - requires CRON_SECRET
 * 2. Manual admin trigger - requires admin role
 *
 * Setup Vercel Cron:
 * Create vercel.json in project root with cron schedule (daily at 0 UTC)
 *
 * For cron testing:
 * curl -X POST http://localhost:3000/api/prices/sync \
 *   -H "Authorization: Bearer your-cron-secret"
 *
 * For manual admin testing:
 * POST /api/prices/sync with admin authentication
 * Body (optional): { "sourceId": "uuid" } to sync specific source
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication: either cron secret or admin user
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    let triggerType: "cron" | "manual" = "cron";
    let triggerUserId: string | undefined;

    if (authHeader === expectedAuth) {
      // Cron trigger - authenticated with secret
      triggerType = "cron";
    } else {
      // Manual trigger - requires admin role
      const { user } = await requireRole("admin");
      triggerType = "manual";
      triggerUserId = user.id;
    }

    // Parse request body for manual triggers (optional sourceId)
    let sourceId: string | undefined;
    try {
      const body = await request.json();
      sourceId = body.sourceId;
    } catch {
      // No body or invalid JSON - sync all sources
    }

    // Perform sync using CrawlerManager
    let result;

    if (sourceId) {
      // Sync specific source
      const singleResult = await crawlerManager.syncSource(
        sourceId,
        triggerType,
        triggerUserId,
      );
      result = {
        results: [
          {
            source: sourceId,
            success: singleResult.success,
            recordsSaved: singleResult.recordsSaved,
            error: singleResult.error,
          },
        ],
        totalRecords: singleResult.recordsSaved,
        totalErrors: singleResult.success ? 0 : 1,
        duration: 0,
      };
    } else {
      // Sync all enabled sources
      result = await crawlerManager.syncAll();
    }

    console.log(
      `Sync completed: ${result.totalRecords} records saved, ${result.totalErrors} errors, ${result.duration}ms`,
    );

    return NextResponse.json({
      success: result.totalErrors === 0,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Price sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync prices",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint - shows sync status and usage information
 */
export async function GET() {
  try {
    // Get status of all sources
    const status = await crawlerManager.getSourcesStatus();

    return NextResponse.json({
      message: "Price sync endpoint",
      usage: {
        cron: "POST /api/prices/sync with Authorization: Bearer {CRON_SECRET}",
        manual: "POST /api/prices/sync (requires admin auth)",
        specific: 'POST /api/prices/sync with body: { "sourceId": "uuid" }',
      },
      sources: status,
    });
  } catch (error) {
    return NextResponse.json({
      message: "Price sync endpoint",
      usage: {
        cron: "POST /api/prices/sync with Authorization: Bearer {CRON_SECRET}",
        manual: "POST /api/prices/sync (requires admin auth)",
        specific: 'POST /api/prices/sync with body: { "sourceId": "uuid" }',
      },
      error: "Failed to fetch sources status",
    });
  }
}
