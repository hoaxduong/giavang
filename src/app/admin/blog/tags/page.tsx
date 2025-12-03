"use client";

import { useQuery } from "@tanstack/react-query";
import { ConfigTable } from "@/components/admin/config/config-table";

interface BlogTag {
  id: string;
  code: string;
  slug: string;
  name: string;
  is_enabled: boolean;
  sort_order: number;
}

export default function BlogTagsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["blog-tags"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      const json = await res.json();
      // Map slug to code for ConfigTable compatibility
      return json.tags.map((tag: Omit<BlogTag, "code">) => ({
        ...tag,
        code: tag.slug,
        sort_order: tag.sort_order ?? 0,
      })) as BlogTag[];
    },
  });

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Thẻ Blog</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý các thẻ cho bài viết blog
        </p>
      </div>

      <ConfigTable<BlogTag>
        title="Quản lý Thẻ"
        description="Quản lý danh sách thẻ blog"
        items={data || []}
        isLoading={isLoading}
        apiEndpoint="/api/admin/blog/tags"
        queryKey="blog-tags"
        fields={{
          code: {
            label: "Slug",
            placeholder: "VD: dau-tu, phan-tich-thi-truong",
          },
          name: {
            label: "Tên thẻ",
            placeholder: "VD: Đầu tư, Phân tích thị trường",
          },
        }}
      />
    </div>
  );
}
