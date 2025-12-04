import { z } from "zod";

// ============================================================================
// Category Schemas
// ============================================================================

export const categorySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens only",
    }),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isEnabled: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens only",
    })
    .optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ============================================================================
// Tag Schemas
// ============================================================================

export const tagSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens only",
    }),
  name: z.string().min(1).max(100),
  isEnabled: z.boolean().optional().default(true),
});

export const updateTagSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens only",
    })
    .optional(),
  name: z.string().min(1).max(100).optional(),
  isEnabled: z.boolean().optional(),
});

// ============================================================================
// Post Schemas
// ============================================================================

export const postStatusEnum = z.enum(["draft", "published", "archived"]);

export const postSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens only",
    }),
  excerpt: z.string().max(500).optional(),
  content: z.any(), // Tiptap JSON - validate structure separately if needed
  featuredImageUrl: z.string().url().optional(),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional().default([]),
  status: postStatusEnum.default("draft"),
  publishedAt: z.string().datetime().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImageUrl: z.string().url().optional(),
});

export const updatePostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens only",
    })
    .optional(),
  excerpt: z.string().max(500).optional(),
  content: z.any().optional(),
  featuredImageUrl: z.string().url().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  status: postStatusEnum.optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  ogImageUrl: z.string().url().optional().nullable(),
});

// ============================================================================
// Comment Schemas
// ============================================================================

export const commentStatusEnum = z.enum([
  "pending",
  "approved",
  "rejected",
  "spam",
]);

export const commentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
});

export const moderateCommentSchema = z.object({
  id: z.string().uuid(),
  status: commentStatusEnum,
});

// ============================================================================
// Media Upload Schema
// ============================================================================

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export function validateMediaFile(file: File): {
  valid: boolean;
  error?: string;
  type?: "image" | "video";
} {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(", ")}`,
    };
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image file too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: `Video file too large. Maximum size: ${MAX_VIDEO_SIZE / 1024 / 1024}MB`,
    };
  }

  return {
    valid: true,
    type: isImage ? "image" : "video",
  };
}
