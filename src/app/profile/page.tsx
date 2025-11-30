import { requireAuth } from '@/lib/auth/server'
import { Header } from '@/components/layout/header'
import { ProfileForm } from '@/components/user/profile-form'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const { user, profile } = await requireAuth()

  if (!user || !profile) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Hồ Sơ</h1>
          <p className="text-muted-foreground mt-2">
            Quản lý thông tin cá nhân và tài khoản của bạn
          </p>
        </div>

        <div className="max-w-2xl">
          <ProfileForm />
        </div>
      </main>
    </div>
  )
}

