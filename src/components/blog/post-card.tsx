import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, MessageSquare } from "lucide-react";

interface PostCardProps {
  post: {
    slug: string;
    title: string;
    excerpt: string | null;
    featuredImageUrl: string | null;
    publishedAt: string;
    viewCount: number;
    commentCount: number;
    category: {
      name: string;
      slug: string;
    } | null;
    tags: Array<{
      name: string;
      slug: string;
    }>;
  };
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {post.featuredImageUrl && (
        <Link href={`/blog/${post.slug}`}>
          <div className="aspect-video overflow-hidden bg-muted">
            <img
              src={post.featuredImageUrl}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}

      <div className="p-6 space-y-4">
        {post.category && (
          <Link href={`/blog/category/${post.category.slug}`}>
            <Badge
              variant="secondary"
              className="hover:bg-primary hover:text-primary-foreground"
            >
              {post.category.name}
            </Badge>
          </Link>
        )}

        <Link href={`/blog/${post.slug}`}>
          <h2 className="text-2xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h2>
        </Link>

        {post.excerpt && (
          <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag.slug} href={`/blog/tag/${tag.slug}`}>
                <Badge variant="outline" className="hover:bg-muted">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(post.publishedAt), "dd/MM/yyyy")}
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {post.viewCount}
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {post.commentCount}
          </div>
        </div>
      </div>
    </article>
  );
}
