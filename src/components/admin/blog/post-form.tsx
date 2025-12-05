"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";
import Link from "next/link";
import { generateSlug } from "@/lib/blog/utils";
import { PostStatus } from "@/lib/blog/types";

interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl: string;
  categoryId: string;
  tagIds: string[];
  status: PostStatus;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
}

interface PostFormProps {
  data: PostFormData;
  onChange: (data: PostFormData) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  showCancel?: boolean;
  cancelHref?: string;
}

export function PostForm({
  data,
  onChange,
  onSubmit,
  submitLabel = "Lưu",
  isSubmitting = false,
  showCancel = true,
  cancelHref = "/admin/blog/posts",
}: PostFormProps) {
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>(data.tagIds || []);

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Tag dialog state
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      return json.categories;
    },
  });

  // Fetch tags
  const { data: tags } = useQuery({
    queryKey: ["blog-tags"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      const json = await res.json();
      return json.tags;
    },
  });

  const handleTitleChange = (title: string) => {
    onChange({
      ...data,
      title,
      slug: generateSlug(title),
    });
  };

  const handleTagToggle = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    setSelectedTags(newTags);
    onChange({ ...data, tagIds: newTags });
  };

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = generateSlug(name);
      const res = await fetch("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, isEnabled: true }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
      onChange({ ...data, categoryId: result.category.id });
      setCategoryDialogOpen(false);
      setNewCategoryName("");
    },
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = generateSlug(name);
      const res = await fetch("/api/admin/blog/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, isEnabled: true }),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
      const newTags = [...selectedTags, result.tag.id];
      setSelectedTags(newTags);
      onChange({ ...data, tagIds: newTags });
      setTagDialogOpen(false);
      setNewTagName("");
    },
  });

  const handleImageUpload = async (type: "featured" | "og") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", type);

        const res = await fetch("/api/admin/blog/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const { url } = await res.json();

        if (type === "featured") {
          onChange({ ...data, featuredImageUrl: url });
        } else {
          onChange({ ...data, ogImageUrl: url });
        }
      } catch (error) {
        alert("Failed to upload image");
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Category & Tags */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="category">Danh mục</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCategoryDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Tạo mới
            </Button>
          </div>
          <Select
            value={data.categoryId}
            onValueChange={(value) => onChange({ ...data, categoryId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn danh mục" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Thẻ</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTagDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Tạo mới
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags?.map((tag: any) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleTagToggle(tag.id)}
              >
                {tag.name}
                {selectedTags.includes(tag.id) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Image */}
      <div>
        <Label>Ảnh đại diện</Label>
        <div className="mt-2 space-y-2">
          {data.featuredImageUrl && (
            <div className="relative w-full h-48 border rounded-md overflow-hidden">
              <img
                src={data.featuredImageUrl}
                alt="Featured"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleImageUpload("featured")}
          >
            {data.featuredImageUrl ? "Thay đổi ảnh" : "Tải ảnh lên"}
          </Button>
        </div>
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="status">Trạng thái</Label>
        <Select
          value={data.status}
          onValueChange={(value: PostStatus) =>
            onChange({ ...data, status: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Bản nháp</SelectItem>
            <SelectItem value="published">Đã xuất bản</SelectItem>
            <SelectItem value="archived">Lưu trữ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      {onSubmit && (
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            onClick={onSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            className="flex-1"
          >
            {submitLabel}
          </Button>
          {showCancel && (
            <Link href={cancelHref}>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* SEO Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">SEO Settings</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input
              id="metaTitle"
              value={data.metaTitle}
              onChange={(e) => onChange({ ...data, metaTitle: e.target.value })}
              placeholder="Để trống để dùng tiêu đề bài viết"
            />
          </div>

          <div>
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={data.metaDescription}
              onChange={(e) =>
                onChange({ ...data, metaDescription: e.target.value })
              }
              placeholder="Mô tả ngắn cho SEO (150-160 ký tự)"
              rows={3}
            />
          </div>

          <div>
            <Label>Open Graph Image</Label>
            <div className="mt-2 space-y-2">
              {data.ogImageUrl && (
                <div className="relative w-full h-32 border rounded-md overflow-hidden">
                  <img
                    src={data.ogImageUrl}
                    alt="OG"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleImageUpload("og")}
              >
                {data.ogImageUrl ? "Thay đổi ảnh OG" : "Tải ảnh OG lên"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Ảnh hiển thị khi chia sẻ trên mạng xã hội (1200x630px khuyến
                nghị)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo danh mục mới</DialogTitle>
            <DialogDescription>Tạo danh mục mới cho bài viết</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="categoryName">Tên danh mục</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="VD: Tin tức vàng"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategoryName.trim()) {
                    createCategoryMutation.mutate(newCategoryName.trim());
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Slug sẽ tự động tạo từ tên
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryDialogOpen(false);
                setNewCategoryName("");
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (newCategoryName.trim()) {
                  createCategoryMutation.mutate(newCategoryName.trim());
                }
              }}
              loading={createCategoryMutation.isPending}
              disabled={
                !newCategoryName.trim() || createCategoryMutation.isPending
              }
            >
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thẻ mới</DialogTitle>
            <DialogDescription>Tạo thẻ mới cho bài viết</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tagName">Tên thẻ</Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="VD: Đầu tư"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTagName.trim()) {
                    createTagMutation.mutate(newTagName.trim());
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Slug sẽ tự động tạo từ tên
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTagDialogOpen(false);
                setNewTagName("");
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (newTagName.trim()) {
                  createTagMutation.mutate(newTagName.trim());
                }
              }}
              loading={createTagMutation.isPending}
              disabled={!newTagName.trim() || createTagMutation.isPending}
            >
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
