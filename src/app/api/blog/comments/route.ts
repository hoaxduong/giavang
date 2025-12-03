import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { commentSchema } from '@/lib/blog/validations'
import { dbCommentToComment } from '@/lib/blog/types'

/**
 * POST /api/blog/comments
 * Submit a comment (authenticated users only)
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth()
    const supabase = await createClient()

    const body = await request.json()
    const validated = commentSchema.parse(body)

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('id', validated.postId)
      .eq('status', 'published')
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Create comment
    const { data, error } = await supabase
      .from('blog_comments')
      .insert({
        post_id: validated.postId,
        author_id: user.id,
        content: validated.content,
        parent_id: validated.parentId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      comment: dbCommentToComment(data),
      message: 'Comment submitted successfully. Awaiting moderation.',
    }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    return NextResponse.json(
      { error: error.message || 'Unauthorized or invalid request' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
