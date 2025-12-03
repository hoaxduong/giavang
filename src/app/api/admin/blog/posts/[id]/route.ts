import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { updatePostSchema } from '@/lib/blog/validations'
import { dbPostToPost } from '@/lib/blog/types'

/**
 * GET /api/admin/blog/posts/[id]
 * Get a single blog post by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireRole('admin')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Get post tags
    const { data: postTags } = await supabase
      .from('blog_post_tags')
      .select('tag_id')
      .eq('post_id', id)

    const post = dbPostToPost(data)
    const tagIds = postTags?.map(pt => pt.tag_id) || []

    return NextResponse.json({ post, tagIds })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * PUT /api/admin/blog/posts/[id]
 * Update a blog post
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireRole('admin')
    const supabase = await createClient()

    const body = await request.json()
    const validated = updatePostSchema.parse({ ...body, id })

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.slug !== undefined) updateData.slug = validated.slug
    if (validated.excerpt !== undefined) updateData.excerpt = validated.excerpt
    if (validated.content !== undefined) updateData.content = validated.content
    if (validated.featuredImageUrl !== undefined) updateData.featured_image_url = validated.featuredImageUrl
    if (validated.categoryId !== undefined) updateData.category_id = validated.categoryId
    if (validated.metaTitle !== undefined) updateData.meta_title = validated.metaTitle
    if (validated.metaDescription !== undefined) updateData.meta_description = validated.metaDescription
    if (validated.ogImageUrl !== undefined) updateData.og_image_url = validated.ogImageUrl

    // Handle status change
    if (validated.status !== undefined) {
      updateData.status = validated.status

      // Auto-set published_at when status changes to 'published'
      if (validated.status === 'published' && !validated.publishedAt) {
        updateData.published_at = new Date().toISOString()
      }
    }

    // Handle explicit publishedAt
    if (validated.publishedAt !== undefined) {
      updateData.published_at = validated.publishedAt
    }

    // Update post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 400 })
    }

    // Update tags if provided
    if (validated.tagIds !== undefined) {
      // Delete existing tags
      await supabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', id)

      // Insert new tags
      if (validated.tagIds.length > 0) {
        const tagInserts = validated.tagIds.map(tagId => ({
          post_id: id,
          tag_id: tagId,
        }))

        const { error: tagError } = await supabase
          .from('blog_post_tags')
          .insert(tagInserts)

        if (tagError) {
          return NextResponse.json({ error: tagError.message }, { status: 400 })
        }
      }
    }

    return NextResponse.json({ post: dbPostToPost(post) })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Unauthorized or invalid request' },
      { status: 401 }
    )
  }
}

/**
 * DELETE /api/admin/blog/posts/[id]
 * Delete a blog post
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireRole('admin')
    const supabase = await createClient()

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
