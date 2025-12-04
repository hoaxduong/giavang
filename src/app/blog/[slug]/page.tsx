import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  dbPostToPost,
  dbCategoryToCategory,
  dbTagToTag,
} from "@/lib/blog/types";
import { PostContent } from "@/components/blog/post-content";
import { PostMeta } from "@/components/blog/post-meta";
import { BlogBreadcrumb } from "@/components/blog/blog-breadcrumb";
import { Header } from "@/components/layout/header";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) return {};

  return {
    title: data.meta_title || data.title,
    description: data.meta_description || data.excerpt,
    openGraph: {
      title: data.meta_title || data.title,
      description: data.meta_description || data.excerpt,
      images:
        data.og_image_url || data.featured_image_url
          ? [data.og_image_url || data.featured_image_url]
          : [],
      type: "article",
      publishedTime: data.published_at,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      `
      *,
      category:blog_categories(*),
      post_tags:blog_post_tags(tag:blog_tags(*))
    `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) {
    notFound();
  }

  const post = dbPostToPost(data);
  const category = data.category ? dbCategoryToCategory(data.category) : null;
  const tags =
    data.post_tags?.map((pt: { tag: any }) => dbTagToTag(pt.tag)) || [];

  // Fetch author separately if author_id exists
  let author = null;
  if (data.author_id) {
    const { data: authorData } = await supabase
      .from("user_profiles")
      .select("id, full_name, avatar_url")
      .eq("id", data.author_id)
      .single();
    author = authorData;
  }

  return (
    <>
      <Header />
      <article className="container mx-auto px-6 py-12 max-w-4xl">
        <BlogBreadcrumb
          items={[{ label: "Blog", href: "/blog" }, { label: post.title }]}
        />

        {post.featuredImageUrl && (
          <div className="aspect-video overflow-hidden rounded-lg mb-8">
            <img
              src={post.featuredImageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>
          )}

          <PostMeta
            post={{
              publishedAt: post.publishedAt || new Date().toISOString(),
              viewCount: post.viewCount,
              commentCount: post.commentCount,
              category,
              tags,
              author: author
                ? { fullName: author.full_name }
                : { fullName: "Unknown" },
            }}
          />
        </header>

        <div className="border-t pt-8">
          <PostContent content={post.content} />
        </div>

        {/* JSON-LD Structured Data */}
        {author && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: post.title,
                image: post.featuredImageUrl,
                datePublished: post.publishedAt,
                dateModified: post.updatedAt,
                author: {
                  "@type": "Person",
                  name: author.full_name,
                },
              }),
            }}
          />
        )}
      </article>
    </>
  );
}
