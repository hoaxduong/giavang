import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { fetchDailyPrices } from "@/lib/prices";
import { generateDailyGoldPost } from "@/lib/ai/gold-post-generator";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  try {
    // 1. Auth check: Ensure user is admin
    const { user } = await requireRole("admin");
    const supabase = await createClient();

    // 2. Fetch prices
    // Note: We reuse the same logic
    const prices = await fetchDailyPrices(supabase);
    if (!prices.length) {
      return NextResponse.json(
        { message: "No prices found for today" },
        { status: 404 }
      );
    }

    // 1.5 Fetch AI Config
    // We use the same supabase client (admin role or user role)
    // 1.5 Fetch AI Config & Post Config
    const { data: configData } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["ai_config", "gold_post_config"]);

    const aiConfig = configData?.find((c) => c.key === "ai_config")?.value;
    const postConfig = configData?.find(
      (c) => c.key === "gold_post_config"
    )?.value;

    // 3. Generate content
    const aiPost = await generateDailyGoldPost(prices, aiConfig);

    // 4. Update Post
    const SLUG = "gia-vang-hom-nay";

    const { data: existingPost } = await supabase
      .from("blog_posts")
      .select("id, author_id")
      .eq("slug", SLUG)
      .single();

    // If manual trigger, and no existing post, we use current admin as author
    const authorId = existingPost?.author_id || user.id;

    // Read config
    const targetCategoryId = postConfig?.targetCategoryId || null;
    const targetTagIds = Array.isArray(postConfig?.targetTagIds)
      ? postConfig.targetTagIds
      : [];
    const postMode = postConfig?.postMode || "update";

    // Determine slug based on mode
    let slug: string;
    if (postMode === "create") {
      // Create mode: generate unique slug with date
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      slug = `gia-vang-hom-nay-${dateStr}`;
    } else {
      // Update mode: use fixed slug
      slug = "gia-vang-hom-nay";
    }

    const postData = {
      slug,
      title: aiPost.title,
      excerpt: aiPost.excerpt,
      content: aiPost.content,
      updated_at: new Date().toISOString(),
      status: "published",
      author_id: authorId,
      category_id: targetCategoryId,
      meta_title: aiPost.title,
      meta_description: aiPost.excerpt,
    };

    let result;
    if (postMode === "update" && existingPost) {
      const { data, error } = await supabase
        .from("blog_posts")
        .update(postData)
        .eq("id", existingPost.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          ...postData,
          created_at: new Date().toISOString(),
          view_count: 0,
          comment_count: 0,
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    // Update Tags
    if (result && targetTagIds.length > 0) {
      const tagInserts = targetTagIds.map((tagId: string) => ({
        post_id: result.id,
        tag_id: tagId,
      }));
      const { error: tagError } = await supabase
        .from("blog_post_tags")
        .upsert(tagInserts, { onConflict: "post_id,tag_id" });

      if (tagError) {
        console.error("Failed to update tags:", tagError);
      }
    }

    // 5. Log Success
    await supabase.from("automation_logs").insert({
      type: "daily_gold_post",
      status: "success",
      message: `Manually triggered update by ${user.email}`,
      meta: {
        postId: result.id,
        style: aiPost.style,
        title: aiPost.title,
        triggeredBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      generatedStyle: aiPost.style,
    });
  } catch (error) {
    console.error("Manual generation failed:", error);

    // Attempt to log error
    try {
      const supabase = await createClient();
      await supabase.from("automation_logs").insert({
        type: "daily_gold_post",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        meta: {
          manual: true,
          error:
            error instanceof Error ? error.message : "Unknown error object",
        },
      });
    } catch (_e) {
      /* ignore log error */
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = await createClient();

    const { searchParams } = new URL(_request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const { data, error } = await supabase
      .from("automation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ logs: data });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
