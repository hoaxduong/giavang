// Blog Type Definitions

// ============================================================================
// Enums
// ============================================================================

export type PostStatus = "draft" | "published" | "archived";
export type CommentStatus = "pending" | "approved" | "rejected" | "spam";

// ============================================================================
// Database Types (snake_case - matches Supabase)
// ============================================================================

export interface DbBlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbBlogTag {
  id: string;
  slug: string;
  name: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: any; // Tiptap JSON
  featured_image_url: string | null;
  category_id: string | null;
  author_id: string;
  status: PostStatus;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  view_count: number;
  comment_count: number;
  search_vector: any;
  created_at: string;
  updated_at: string;
}

export interface DbBlogPostTag {
  id: string;
  post_id: string;
  tag_id: string;
  created_at: string;
}

export interface DbBlogComment {
  id: string;
  post_id: string;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  content: string;
  status: CommentStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Application Types (camelCase - for frontend/API)
// ============================================================================

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogTag {
  id: string;
  slug: string;
  name: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: any; // Tiptap JSON
  featuredImageUrl: string | null;
  categoryId: string | null;
  authorId: string;
  status: PostStatus;
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostWithRelations extends BlogPost {
  category: BlogCategory | null;
  tags: BlogTag[];
  author: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface BlogComment {
  id: string;
  postId: string;
  authorId: string | null;
  authorName: string | null;
  authorEmail: string | null;
  content: string;
  status: CommentStatus;
  moderatedBy: string | null;
  moderatedAt: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCommentWithAuthor extends BlogComment {
  author: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
}

export interface BlogCommentWithPost extends BlogComment {
  post: {
    id: string;
    title: string;
    slug: string;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreatePostRequest {
  title: string;
  slug: string;
  excerpt?: string;
  content: any; // Tiptap JSON
  featuredImageUrl?: string;
  categoryId?: string;
  tagIds?: string[];
  status: PostStatus;
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
}

export interface UpdatePostRequest {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: any;
  featuredImageUrl?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: PostStatus;
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
}

export interface CreateCategoryRequest {
  slug: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  id: string;
  slug?: string;
  name?: string;
  description?: string;
  isEnabled?: boolean;
  sortOrder?: number;
}

export interface CreateTagRequest {
  slug: string;
  name: string;
  isEnabled?: boolean;
}

export interface UpdateTagRequest {
  id: string;
  slug?: string;
  name?: string;
  isEnabled?: boolean;
}

export interface CreateCommentRequest {
  postId: string;
  content: string;
  parentId?: string;
}

export interface ModerateCommentRequest {
  id: string;
  status: CommentStatus;
}

export interface UploadMediaResponse {
  url: string;
  path: string;
  type: "image" | "video";
}

// ============================================================================
// Converter Functions (DB <-> App types)
// ============================================================================

export function dbCategoryToCategory(db: DbBlogCategory): BlogCategory {
  return {
    id: db.id,
    slug: db.slug,
    name: db.name,
    description: db.description,
    isEnabled: db.is_enabled,
    sortOrder: db.sort_order,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function dbTagToTag(db: DbBlogTag): BlogTag {
  return {
    id: db.id,
    slug: db.slug,
    name: db.name,
    isEnabled: db.is_enabled,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function dbPostToPost(db: DbBlogPost): BlogPost {
  return {
    id: db.id,
    slug: db.slug,
    title: db.title,
    excerpt: db.excerpt,
    content: db.content,
    featuredImageUrl: db.featured_image_url,
    categoryId: db.category_id,
    authorId: db.author_id,
    status: db.status,
    publishedAt: db.published_at,
    metaTitle: db.meta_title,
    metaDescription: db.meta_description,
    ogImageUrl: db.og_image_url,
    viewCount: db.view_count,
    commentCount: db.comment_count,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function dbCommentToComment(db: DbBlogComment): BlogComment {
  return {
    id: db.id,
    postId: db.post_id,
    authorId: db.author_id,
    authorName: db.author_name,
    authorEmail: db.author_email,
    content: db.content,
    status: db.status,
    moderatedBy: db.moderated_by,
    moderatedAt: db.moderated_at,
    parentId: db.parent_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}
