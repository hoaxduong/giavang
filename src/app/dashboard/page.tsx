import { requireAuth } from '@/lib/auth/server'
import { Header } from '@/components/layout/header'
import { RefreshIndicator } from '@/components/shared/refresh-indicator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const { user, profile } = await requireAuth()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Bảng Điều Khiển
              </h1>
              <p className="text-muted-foreground mt-2">
                Chào mừng trở lại, {profile?.full_name || user.email}!
              </p>
            </div>
            <RefreshIndicator />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Thông Tin Tài Khoản</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile?.full_name
                        ? profile.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        : user.email?.[0].toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {profile?.full_name || 'Người dùng'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Giá Vàng Hôm Nay
          </h2>
          <DashboardClient />
        </div>
      </main>
    </div>
  )
}

