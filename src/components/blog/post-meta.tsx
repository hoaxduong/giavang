import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, MessageSquare, User } from "lucide-react";

interface PostMetaProps {
  post: {
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
    author: {
      fullName: string;
    };
  };
}

export function PostMeta({ post }: PostMetaProps) {
  return (
    <div className="space-y-6">
      {/* Author & Date */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>{post.author.fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(post.publishedAt), "dd/MM/yyyy")}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          {post.viewCount} lượt xem
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {post.commentCount} bình luận
        </div>
      </div>

      {/* Category */}
      {post.category && (
        <div>
          <span className="text-sm text-muted-foreground mr-2">Danh mục:</span>
          <Link href={`/blog/category/${post.category.slug}`}>
            <Badge
              variant="secondary"
              className="hover:bg-primary hover:text-primary-foreground"
            >
              {post.category.name}
            </Badge>
          </Link>
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div>
          <span className="text-sm text-muted-foreground block mb-2">Thẻ:</span>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag.slug} href={`/blog/tag/${tag.slug}`}>
                <Badge variant="outline" className="hover:bg-muted">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
