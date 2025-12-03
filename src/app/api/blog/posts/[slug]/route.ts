import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { dbPostToPost, dbCategoryToCategory, dbTagToTag, dbCommentToComment } from '@/lib/blog/types'

/**
 * GET /api/blog/posts/[slug]
 * Get single published post by slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Fetch post with relations
    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*),
        post_tags:blog_post_tags(tag:blog_tags(*)),
        author:user_profiles(id, full_name, avatar_url)
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Fetch approved comments
    const { data: comments } = await supabase
      .from('blog_comments')
      .select(`
        *,
        author:user_profiles(id, full_name, avatar_url)
      `)
      .eq('post_id', data.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    // Increment view count (using service role to bypass RLS)
    const serviceSupabase = createServiceRoleClient()
    await serviceSupabase
      .from('blog_posts')
      .update({ view_count: data.view_count + 1 })
      .eq('id', data.id)

    // Transform data
    const post = dbPostToPost(data)
    const category = data.category ? dbCategoryToCategory(data.category) : null
    const tags = data.post_tags?.map((pt: any) => dbTagToTag(pt.tag)) || []
    const transformedComments = comments?.map(c => {
      const comment = dbCommentToComment(c)
      return {
        ...comment,
        author: c.author,
      }
    }) || []

    return NextResponse.json({
      post: {
        ...post,
        category,
        tags,
        author: data.author,
      },
      comments: transformedComments,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
