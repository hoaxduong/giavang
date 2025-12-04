import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  dbPostToPost,
  dbCategoryToCategory,
  dbTagToTag,
} from "@/lib/blog/types";

/**
 * GET /api/blog/posts
 * Public list of published posts with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const tagSlug = searchParams.get("tag");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("blog_posts")
      .select(
        `
        *,
        category:blog_categories(*),
        post_tags:blog_post_tags(tag:blog_tags(*))
      `,
        { count: "exact" },
      )
      .eq("status", "published");

    // Filter by category
    if (categorySlug) {
      const { data: category } = await supabase
        .from("blog_categories")
        .select("id")
        .eq("slug", categorySlug)
        .single();

      if (category) {
        query = query.eq("category_id", category.id);
      }
    }

    // Filter by tag
    if (tagSlug) {
      const { data: tag } = await supabase
        .from("blog_tags")
        .select("id")
        .eq("slug", tagSlug)
        .single();

      if (tag) {
        const { data: postTags } = await supabase
          .from("blog_post_tags")
          .select("post_id")
          .eq("tag_id", tag.id);

        const postIds = postTags?.map((pt) => pt.post_id) || [];
        if (postIds.length > 0) {
          query = query.in("id", postIds);
        }
      }
    }

    // Full-text search
    if (search) {
      query = query.textSearch("search_vector", search);
    }

    // Order and pagination
    query = query
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Transform data
    const posts = data.map((item) => {
      const post = dbPostToPost(item);
      const category = item.category
        ? dbCategoryToCategory(item.category)
        : null;
      const tags = item.post_tags?.map((pt: any) => dbTagToTag(pt.tag)) || [];

      return {
        ...post,
        category,
        tags,
      };
    });

    return NextResponse.json({
      posts,
      count: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
