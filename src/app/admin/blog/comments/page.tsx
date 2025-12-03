import { CommentModerator } from '@/components/admin/blog/comment-moderator'

export default function BlogCommentsPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Bình luận</h1>
        <p className="text-muted-foreground mt-2">
          Duyệt và quản lý bình luận từ người dùng
        </p>
      </div>

      <CommentModerator />
    </div>
  )
}
