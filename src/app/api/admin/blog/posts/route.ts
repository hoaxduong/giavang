import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { postSchema } from "@/lib/blog/validations";
import { dbPostToPost } from "@/lib/blog/types";

/**
 * GET /api/admin/blog/posts
 * List all blog posts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireRole("admin");
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase.from("blog_posts").select("*", { count: "exact" });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (search) {
      // Full-text search using search_vector
      query = query.textSearch("search_vector", search);
    }

    // Order and pagination
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const posts = data.map(dbPostToPost);
    return NextResponse.json({
      posts,
      count: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * POST /api/admin/blog/posts
 * Create a new blog post
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRole("admin");
    const supabase = await createClient();

    const body = await request.json();
    const validated = postSchema.parse(body);

    // Auto-set published_at if status is 'published' and not provided
    const publishedAt =
      validated.status === "published"
        ? validated.publishedAt || new Date().toISOString()
        : validated.publishedAt;

    // Insert post
    const { data: post, error: postError } = await supabase
      .from("blog_posts")
      .insert({
        slug: validated.slug,
        title: validated.title,
        excerpt: validated.excerpt,
        content: validated.content,
        featured_image_url: validated.featuredImageUrl,
        category_id: validated.categoryId,
        author_id: user.id,
        status: validated.status,
        published_at: publishedAt,
        meta_title: validated.metaTitle,
        meta_description: validated.metaDescription,
        og_image_url: validated.ogImageUrl,
      })
      .select()
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 400 });
    }

    // Insert post tags if provided
    if (validated.tagIds && validated.tagIds.length > 0) {
      const tagInserts = validated.tagIds.map((tagId) => ({
        post_id: post.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("blog_post_tags")
        .insert(tagInserts);

      if (tagError) {
        // Rollback post creation if tag insertion fails
        await supabase.from("blog_posts").delete().eq("id", post.id);
        return NextResponse.json({ error: tagError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ post: dbPostToPost(post) }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unauthorized or invalid request" },
      { status: 401 },
    );
  }
}
