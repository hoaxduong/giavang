import { createServiceRoleClient } from "@/lib/supabase/service-role";

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Generate URL-friendly slug from title
 * Converts Vietnamese characters to ASCII and formats for URLs
 */
export function generateSlug(title: string): string {
  // Vietnamese character map
  const vietnameseMap: Record<string, string> = {
    à: "a",
    á: "a",
    ạ: "a",
    ả: "a",
    ã: "a",
    â: "a",
    ầ: "a",
    ấ: "a",
    ậ: "a",
    ẩ: "a",
    ẫ: "a",
    ă: "a",
    ằ: "a",
    ắ: "a",
    ặ: "a",
    ẳ: "a",
    ẵ: "a",
    è: "e",
    é: "e",
    ẹ: "e",
    ẻ: "e",
    ẽ: "e",
    ê: "e",
    ề: "e",
    ế: "e",
    ệ: "e",
    ể: "e",
    ễ: "e",
    ì: "i",
    í: "i",
    ị: "i",
    ỉ: "i",
    ĩ: "i",
    ò: "o",
    ó: "o",
    ọ: "o",
    ỏ: "o",
    õ: "o",
    ô: "o",
    ồ: "o",
    ố: "o",
    ộ: "o",
    ổ: "o",
    ỗ: "o",
    ơ: "o",
    ờ: "o",
    ớ: "o",
    ợ: "o",
    ở: "o",
    ỡ: "o",
    ù: "u",
    ú: "u",
    ụ: "u",
    ủ: "u",
    ũ: "u",
    ư: "u",
    ừ: "u",
    ứ: "u",
    ự: "u",
    ử: "u",
    ữ: "u",
    ỳ: "y",
    ý: "y",
    ỵ: "y",
    ỷ: "y",
    ỹ: "y",
    đ: "d",
    À: "A",
    Á: "A",
    Ạ: "A",
    Ả: "A",
    Ã: "A",
    Â: "A",
    Ầ: "A",
    Ấ: "A",
    Ậ: "A",
    Ẩ: "A",
    Ẫ: "A",
    Ă: "A",
    Ằ: "A",
    Ắ: "A",
    Ặ: "A",
    Ẳ: "A",
    Ẵ: "A",
    È: "E",
    É: "E",
    Ẹ: "E",
    Ẻ: "E",
    Ẽ: "E",
    Ê: "E",
    Ề: "E",
    Ế: "E",
    Ệ: "E",
    Ể: "E",
    Ễ: "E",
    Ì: "I",
    Í: "I",
    Ị: "I",
    Ỉ: "I",
    Ĩ: "I",
    Ò: "O",
    Ó: "O",
    Ọ: "O",
    Ỏ: "O",
    Õ: "O",
    Ô: "O",
    Ồ: "O",
    Ố: "O",
    Ộ: "O",
    Ổ: "O",
    Ỗ: "O",
    Ơ: "O",
    Ờ: "O",
    Ớ: "O",
    Ợ: "O",
    Ở: "O",
    Ỡ: "O",
    Ù: "U",
    Ú: "U",
    Ụ: "U",
    Ủ: "U",
    Ũ: "U",
    Ư: "U",
    Ừ: "U",
    Ứ: "U",
    Ự: "U",
    Ử: "U",
    Ữ: "U",
    Ỳ: "Y",
    Ý: "Y",
    Ỵ: "Y",
    Ỷ: "Y",
    Ỹ: "Y",
    Đ: "D",
  };

  let slug = title.toLowerCase();

  // Replace Vietnamese characters
  for (const [viet, ascii] of Object.entries(vietnameseMap)) {
    slug = slug.replace(new RegExp(viet, "g"), ascii);
  }

  // Replace special characters with spaces
  slug = slug.replace(/[^a-z0-9\s-]/g, " ");

  // Replace multiple spaces/hyphens with single hyphen
  slug = slug.replace(/[\s-]+/g, "-");

  // Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, "");

  return slug;
}

// ============================================================================
// Media Type Detection
// ============================================================================

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const VIDEO_EXTENSIONS = ["mp4", "webm"];

/**
 * Detect media type from file
 */
export function getMediaType(file: File): "image" | "video" | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension) return null;

  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (VIDEO_EXTENSIONS.includes(extension)) return "video";

  return null;
}

// ============================================================================
// Supabase Storage Operations
// ============================================================================

const BUCKET_NAME = "blog-media";

/**
 * Upload media file to Supabase Storage
 * @param file - File to upload
 * @param type - Media type (image or video)
 * @param folder - Optional subfolder (featured, content, og, or custom)
 * @returns Public URL of uploaded file
 */
export async function uploadMedia(
  file: File,
  type: "image" | "video",
  folder?: string,
): Promise<{ url: string; path: string }> {
  const supabase = createServiceRoleClient();

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split(".").pop();
  const filename = `${timestamp}-${randomString}.${extension}`;

  // Determine path based on type and folder
  let path: string;
  if (folder) {
    path = `${type}s/${folder}/${filename}`;
  } else {
    path = `${type}s/${filename}`;
  }

  // Upload file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete media file from Supabase Storage
 * @param url - Public URL of file to delete
 */
export async function deleteMedia(url: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // Extract path from URL
  // URL format: https://{project}.supabase.co/storage/v1/object/public/blog-media/{path}
  const urlParts = url.split(`/${BUCKET_NAME}/`);
  if (urlParts.length < 2) {
    throw new Error("Invalid media URL");
  }

  const path = urlParts[1];

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Delete multiple media files from Supabase Storage
 * @param urls - Array of public URLs to delete
 */
export async function deleteMultipleMedia(urls: string[]): Promise<void> {
  const supabase = createServiceRoleClient();

  const paths = urls.map((url) => {
    const urlParts = url.split(`/${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      throw new Error(`Invalid media URL: ${url}`);
    }
    return urlParts[1];
  });

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

// ============================================================================
// Text Utilities
// ============================================================================

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Extract plain text from Tiptap JSON content
 */
export function extractTextFromTiptap(content: any): string {
  if (!content || !content.content) return "";

  const extractFromNode = (node: any): string => {
    if (node.type === "text") {
      return node.text || "";
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractFromNode).join("");
    }

    return "";
  };

  return content.content.map(extractFromNode).join(" ");
}

/**
 * Generate excerpt from Tiptap content
 */
export function generateExcerpt(content: any, maxLength: number = 200): string {
  const text = extractTextFromTiptap(content);
  return truncateText(text, maxLength);
}
