"use client";

import { useQuery } from "@tanstack/react-query";
import type { BlogPost, BlogCategory, BlogTag } from "../blog/types";

export interface BlogPostWithRelations extends BlogPost {
  category: BlogCategory | null;
  tags: BlogTag[];
}

export interface BlogPostsResponse {
  posts: BlogPostWithRelations[];
  count: number;
  limit: number;
  offset: number;
}

interface UseBlogPostsOptions {
  limit?: number;
  offset?: number;
  category?: string;
  tag?: string;
  search?: string;
}

export function useBlogPosts(options: UseBlogPostsOptions = {}) {
  const { limit = 10, offset = 0, category, tag, search } = options;

  return useQuery({
    queryKey: ["blog", "posts", { limit, offset, category, tag, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      if (category) params.append("category", category);
      if (tag) params.append("tag", tag);
      if (search) params.append("search", search);

      const response = await fetch(`/api/blog/posts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch blog posts");
      }
      return response.json() as Promise<BlogPostsResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
