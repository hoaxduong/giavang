import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { tagSchema, updateTagSchema } from '@/lib/blog/validations'
import { dbTagToTag } from '@/lib/blog/types'

/**
 * GET /api/admin/blog/tags
 * List all blog tags
 */
export async function GET() {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const tags = data.map(dbTagToTag)
    return NextResponse.json({ tags })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * POST /api/admin/blog/tags
 * Create a new blog tag
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const body = await request.json()
    const validated = tagSchema.parse(body)

    const { data, error } = await supabase
      .from('blog_tags')
      .insert({
        slug: validated.slug,
        name: validated.name,
        is_enabled: validated.isEnabled,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ tag: dbTagToTag(data) }, { status: 201 })
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
 * PUT /api/admin/blog/tags
 * Update a blog tag
 */
export async function PUT(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const body = await request.json()
    const validated = updateTagSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.slug !== undefined) updateData.slug = validated.slug
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.isEnabled !== undefined) updateData.is_enabled = validated.isEnabled

    const { data, error } = await supabase
      .from('blog_tags')
      .update(updateData)
      .eq('id', validated.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ tag: dbTagToTag(data) })
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
 * DELETE /api/admin/blog/tags
 * Delete a blog tag
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
      .from('blog_tags')
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
