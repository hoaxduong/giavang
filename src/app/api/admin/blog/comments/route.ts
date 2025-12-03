import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { dbCommentToComment } from '@/lib/blog/types'

/**
 * GET /api/admin/blog/comments
 * List all comments for moderation with filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const postId = searchParams.get('postId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('blog_comments')
      .select(`
        *,
        post:blog_posts(id, title, slug),
        author:user_profiles(id, full_name, avatar_url)
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (postId) {
      query = query.eq('post_id', postId)
    }

    // Order and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Transform data to include relations
    const comments = data.map(item => {
      const comment = dbCommentToComment(item)
      return {
        ...comment,
        post: item.post,
        author: item.author,
      }
    })

    return NextResponse.json({
      comments,
      count: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * DELETE /api/admin/blog/comments
 * Delete a comment
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('blog_comments')
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
