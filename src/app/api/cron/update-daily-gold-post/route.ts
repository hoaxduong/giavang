import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchDailyPrices } from "@/lib/prices";
import { generateDailyGoldPost } from "@/lib/ai/gold-post-generator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch prices
    console.log("Fetching daily prices...");
    const prices = await fetchDailyPrices(supabase);
    if (!prices.length) {
      return NextResponse.json({ message: "No prices found for today" });
    }

    // 1.5 Fetch AI Config & Post Config
    const { data: configData } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["ai_config", "gold_post_config"]);

    const aiConfig = configData?.find((c) => c.key === "ai_config")?.value;
    const postConfig = configData?.find(
      (c) => c.key === "gold_post_config"
    )?.value;

    // 2. Generate content
    console.log("Generating AI content...");
    const aiPost = await generateDailyGoldPost(prices, aiConfig);

    // 3. Find or create Author
    // Try to find an existing author from the post itself or default to an admin
    const SLUG = "gia-vang-hom-nay";

    // Check if post exists
    const { data: existingPost } = await supabase
      .from("blog_posts")
      .select("id, author_id")
      .eq("slug", SLUG)
      .single();

    let authorId = existingPost?.author_id;

    if (!authorId) {
      // Find an admin user to assign as author
      // This part depends on how users are stored.
      // Assuming we can query the users table or existing posts to find an author.
      // Fallback: Pick the author of the most recent post
      const { data: latestPost } = await supabase
        .from("blog_posts")
        .select("author_id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      authorId = latestPost?.author_id;
    }

    if (!authorId) {
      // If still no author, strictly we fail, but for now let's error out
      // Only happens if blog is completely empty
      return NextResponse.json(
        { error: "No author found to assign post to" },
        { status: 500 }
      );
    }

    // Read config for category and tags
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

    // 4. Update or Insert Post
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

    // 5. Update Tags
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
        // Don't fail the whole request, just log it
      }
    }

    // Log success
    await supabase.from("automation_logs").insert({
      type: "daily_gold_post",
      status: "success",
      message: `Successfully ${existingPost ? "updated" : "created"} post`,
      meta: {
        postId: result.id,
        style: aiPost.style,
        title: aiPost.title,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      generatedStyle: aiPost.style,
    });
  } catch (error) {
    console.error("Cron job failed:", error);

    // Log error (attempting to use supabase client if available, or just console)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from("automation_logs").insert({
        type: "daily_gold_post",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        meta: {
          error:
            error instanceof Error ? error.message : "Unknown error object",
        },
      });
    } catch (logError) {
      console.error("Failed to log error to DB:", logError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
