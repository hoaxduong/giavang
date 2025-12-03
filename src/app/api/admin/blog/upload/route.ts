import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/server'
import { validateMediaFile } from '@/lib/blog/validations'
import { uploadMedia } from '@/lib/blog/utils'

/**
 * POST /api/admin/blog/upload
 * Upload media file (image or video) to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole('admin')

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const validation = validateMediaFile(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Upload file
    const { url, path } = await uploadMedia(
      file,
      validation.type!,
      folder || undefined
    )

    return NextResponse.json({
      url,
      path,
      type: validation.type,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
