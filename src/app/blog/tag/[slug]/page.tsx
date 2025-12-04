import { PostCard } from "@/components/blog/post-card";
import { BlogBreadcrumb } from "@/components/blog/blog-breadcrumb";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";
import {
  dbPostToPost,
  dbCategoryToCategory,
  dbTagToTag,
} from "@/lib/blog/types";
import { notFound } from "next/navigation";

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tag } = await supabase
    .from("blog_tags")
    .select("*")
    .eq("slug", slug)
    .eq("is_enabled", true)
    .single();

  if (!tag) {
    notFound();
  }

  // Get posts with this tag
  const { data: postTags } = await supabase
    .from("blog_post_tags")
    .select("post_id")
    .eq("tag_id", tag.id);

  const postIds = postTags?.map((pt) => pt.post_id) || [];

  if (postIds.length === 0) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-6 py-12">
          <BlogBreadcrumb
            items={[{ label: "Blog", href: "/blog" }, { label: `#${tag.name}` }]}
          />

        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">#{tag.name}</h1>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Chưa có bài viết với thẻ này
        </div>
        </div>
      </>
    );
  }

  const { data } = await supabase
    .from("blog_posts")
    .select(
      `
      *,
      category:blog_categories(*),
      post_tags:blog_post_tags(tag:blog_tags(*))
    `
    )
    .eq("status", "published")
    .in("id", postIds)
    .order("published_at", { ascending: false });

  const posts =
    data
      ?.map((item) => {
        const post = dbPostToPost(item);
        const category = item.category
          ? dbCategoryToCategory(item.category)
          : null;
        const tags =
          item.post_tags?.map((pt: { tag: any }) => dbTagToTag(pt.tag)) || [];
        return {
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          featuredImageUrl: post.featuredImageUrl,
          publishedAt: post.publishedAt || new Date().toISOString(),
          viewCount: post.viewCount,
          commentCount: post.commentCount,
          category,
          tags,
        };
      })
      .filter((post) => post.publishedAt) || [];

  return (
    <>
      <Header />
      <div className="container mx-auto px-6 py-12">
        <BlogBreadcrumb
          items={[{ label: "Blog", href: "/blog" }, { label: `#${tag.name}` }]}
        />

      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">#{tag.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      </div>
    </>
  );
}
