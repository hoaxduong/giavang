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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_enabled", true)
    .single();

  if (!category) {
    notFound();
  }

  const { data } = await supabase
    .from("blog_posts")
    .select(
      `
      *,
      category:blog_categories(*),
      post_tags:blog_post_tags(tag:blog_tags(*))
    `,
    )
    .eq("status", "published")
    .eq("category_id", category.id)
    .order("published_at", { ascending: false });

  const posts =
    data
      ?.map((item) => {
        const post = dbPostToPost(item);
        const cat = item.category ? dbCategoryToCategory(item.category) : null;
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
          category: cat,
          tags,
        };
      })
      .filter((post) => post.publishedAt) || [];

  return (
    <>
      <Header />
      <div className="container mx-auto px-6 py-12">
        <BlogBreadcrumb
          items={[{ label: "Blog", href: "/blog" }, { label: category.name }]}
        />

        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground mt-4">{category.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Chưa có bài viết trong danh mục này
          </div>
        )}
      </div>
    </>
  );
}
