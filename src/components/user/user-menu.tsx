'use client'

import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { signOut } from '@/lib/auth/auth-helpers'
import Link from 'next/link'

export function UserMenu() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  // Show skeleton only if we're still loading auth state
  // Once we have user, show menu even if profile is still loading
  if (loading && !user) {
    return (
      <Skeleton className="h-9 w-24" />
    )
  }

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = profile?.full_name || user.email || 'Người dùng'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto px-2 py-1.5 text-sm font-medium">
          {displayName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.full_name || 'Người dùng'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">Bảng điều khiển</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">Hồ sơ</Link>
        </DropdownMenuItem>
        {profile?.role === 'admin' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">Quản trị</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

