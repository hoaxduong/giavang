import {
  AutomationHandler,
  AutomationContext,
  AutomationResult,
} from "../types";
import { generateDailyGoldPost } from "@/lib/ai/gold-post-generator";
import { fetchDailyPrices } from "@/lib/prices";
import { SupabaseClient } from "@supabase/supabase-js";

export class GoldPricePostHandler implements AutomationHandler {
  async execute(ctx: AutomationContext): Promise<AutomationResult> {
    const { supabase, automation, user, aiConfig } = ctx;

    // 1. Fetch Prices
    const prices = await fetchDailyPrices(supabase);
    if (!prices.length) {
      throw new Error("No prices found for today");
    }

    // 2. Generate Content
    const promptTemplate = automation.prompt_template;
    const aiPost = await generateDailyGoldPost(
      prices,
      aiConfig,
      promptTemplate
    );

    // 3. Save Post
    const SLUG_BASE = "gia-vang-hom-nay";
    const postMode = automation.config?.postMode || "update";

    // Use user if provided (manual trigger), else find an admin (cron)
    const authorId = user?.id || (await this.findDefaultAuthor(supabase));

    if (!authorId) {
      throw new Error("No author found to assign post to.");
    }

    let slug = SLUG_BASE;
    if (postMode === "create") {
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      slug = `${SLUG_BASE}-${dateStr}`;
    }

    // Check existing
    const { data: existingPost } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .single();

    const postData = {
      slug,
      title: aiPost.title,
      excerpt: aiPost.excerpt,
      content: aiPost.content,
      updated_at: new Date().toISOString(),
      status: "published",
      author_id: authorId,
      category_id: automation.config?.targetCategoryId || null,
      meta_title: aiPost.title,
      meta_description: aiPost.excerpt,
    };

    let resultInfo;

    if (existingPost) {
      const { data } = await supabase
        .from("blog_posts")
        .update(postData)
        .eq("id", existingPost.id)
        .select()
        .single();
      resultInfo = data;
    } else {
      const { data } = await supabase
        .from("blog_posts")
        .insert({
          ...postData,
          created_at: new Date().toISOString(),
          view_count: 0,
          comment_count: 0,
        })
        .select()
        .single();
      resultInfo = data;
    }

    // Tags
    if (resultInfo && automation.config?.targetTagIds?.length) {
      const tagInserts = automation.config.targetTagIds.map(
        (tagId: string) => ({
          post_id: resultInfo.id,
          tag_id: tagId,
        })
      );
      await supabase
        .from("blog_post_tags")
        .upsert(tagInserts, { onConflict: "post_id,tag_id" });
    }

    return {
      success: true,
      data: resultInfo,
      meta: {
        postId: resultInfo?.id,
        style: aiPost.style,
        title: aiPost.title,
      },
    };
  }

  private async findDefaultAuthor(supabase: SupabaseClient) {
    const { data: latestPost } = await supabase
      .from("blog_posts")
      .select("author_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return latestPost?.author_id;
  }
}
