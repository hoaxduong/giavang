import { PostCard } from '@/components/blog/post-card'
import { createClient } from '@/lib/supabase/server'
import { dbPostToPost, dbCategoryToCategory, dbTagToTag } from '@/lib/blog/types'

export default async function BlogPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('blog_posts')
    .select(`
      *,
      category:blog_categories(*),
      post_tags:blog_post_tags(tag:blog_tags(*))
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(12)

  const posts = data?.map(item => {
    const post = dbPostToPost(item)
    const category = item.category ? dbCategoryToCategory(item.category) : null
    const tags = item.post_tags?.map((pt: any) => dbTagToTag(pt.tag)) || []
    return { ...post, category, tags }
  }) || []

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <p className="text-muted-foreground mt-4">
          Tin tức, hướng dẫn và phân tích thị trường vàng
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Chưa có bài viết nào
        </div>
      )}
    </div>
  )
}
