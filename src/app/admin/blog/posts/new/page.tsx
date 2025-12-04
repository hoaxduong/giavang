"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PostEditor } from "@/components/admin/blog/post-editor";
import { PostForm } from "@/components/admin/blog/post-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { generateSlug } from "@/lib/blog/utils";

export default function NewPostPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    featuredImageUrl: "",
    categoryId: "",
    tagIds: [] as string[],
    status: "draft" as "draft" | "published" | "archived",
    metaTitle: "",
    metaDescription: "",
    ogImageUrl: "",
  });
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create post");
      }

      return res.json();
    },
    onSuccess: () => {
      router.push("/admin/blog/posts");
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.title) {
      setError("Tiêu đề là bắt buộc");
      return;
    }

    if (!formData.slug) {
      setError("Slug là bắt buộc");
      return;
    }

    if (!content) {
      setError("Nội dung bài viết là bắt buộc");
      return;
    }

    setError(null);

    createMutation.mutate({
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt || undefined,
      content,
      featuredImageUrl: formData.featuredImageUrl || undefined,
      categoryId: formData.categoryId || undefined,
      tagIds: formData.tagIds,
      status: formData.status,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
      ogImageUrl: formData.ogImageUrl || undefined,
    });
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <Link href="/admin/blog/posts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-4">
          Tạo bài viết mới
        </h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Slug */}
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Tiêu đề *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData({
                    ...formData,
                    title,
                    slug: slugEdited ? formData.slug : generateSlug(title),
                  });
                }}
                placeholder="Nhập tiêu đề bài viết"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium mb-2">
                Slug (URL)
              </label>
              <input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                placeholder="slug-url-bai-viet"
                className="w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tự động tạo từ tiêu đề, bạn có thể chỉnh sửa
              </p>
            </div>
          </div>

          {/* Editor */}
          <PostEditor content={content} onChange={setContent} />

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium mb-2">
              Tóm tắt
            </label>
            <textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) =>
                setFormData({ ...formData, excerpt: e.target.value })
              }
              placeholder="Tóm tắt ngắn gọn về bài viết"
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <PostForm
            data={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
            submitLabel="Xuất bản"
            isSubmitting={createMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
