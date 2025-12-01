import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const productTypeSchema = z.object({
  code: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  shortLabel: z.string().min(1).max(50),
  isEnabled: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
})

const updateProductTypeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(50).optional(),
  label: z.string().min(1).max(100).optional(),
  shortLabel: z.string().min(1).max(50).optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

/**
 * GET /api/admin/product-types
 * List all product types
 */
export async function GET() {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('product_types')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ productTypes: data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * POST /api/admin/product-types
 * Create a new product type
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const body = await request.json()
    const validated = productTypeSchema.parse(body)

    const { data, error } = await supabase
      .from('product_types')
      .insert({
        code: validated.code,
        label: validated.label,
        short_label: validated.shortLabel,
        is_enabled: validated.isEnabled,
        sort_order: validated.sortOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ productType: data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Unauthorized or invalid request' },
      { status: 401 }
    )
  }
}

/**
 * PUT /api/admin/product-types
 * Update a product type
 */
export async function PUT(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const body = await request.json()
    const validated = updateProductTypeSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.code !== undefined) updateData.code = validated.code
    if (validated.label !== undefined) updateData.label = validated.label
    if (validated.shortLabel !== undefined) updateData.short_label = validated.shortLabel
    if (validated.isEnabled !== undefined) updateData.is_enabled = validated.isEnabled
    if (validated.sortOrder !== undefined) updateData.sort_order = validated.sortOrder

    const { data, error } = await supabase
      .from('product_types')
      .update(updateData)
      .eq('id', validated.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ productType: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Unauthorized or invalid request' },
      { status: 401 }
    )
  }
}

/**
 * DELETE /api/admin/product-types
 * Delete a product type
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
      .from('product_types')
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
