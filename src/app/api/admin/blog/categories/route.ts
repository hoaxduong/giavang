import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { categorySchema, updateCategorySchema } from '@/lib/blog/validations'
import { dbCategoryToCategory } from '@/lib/blog/types'

/**
 * GET /api/admin/blog/categories
 * List all blog categories
 */
export async function GET() {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const categories = data.map(dbCategoryToCategory)
    return NextResponse.json({ categories })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * POST /api/admin/blog/categories
 * Create a new blog category
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const body = await request.json()
    const validated = categorySchema.parse(body)

    const { data, error } = await supabase
      .from('blog_categories')
      .insert({
        slug: validated.slug,
        name: validated.name,
        description: validated.description,
        is_enabled: validated.isEnabled,
        sort_order: validated.sortOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category: dbCategoryToCategory(data) }, { status: 201 })
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
 * PUT /api/admin/blog/categories
 * Update a blog category
 */
export async function PUT(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const body = await request.json()
    const validated = updateCategorySchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.slug !== undefined) updateData.slug = validated.slug
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.isEnabled !== undefined) updateData.is_enabled = validated.isEnabled
    if (validated.sortOrder !== undefined) updateData.sort_order = validated.sortOrder

    const { data, error } = await supabase
      .from('blog_categories')
      .update(updateData)
      .eq('id', validated.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category: dbCategoryToCategory(data) })
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
 * DELETE /api/admin/blog/categories
 * Delete a blog category
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
      .from('blog_categories')
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
