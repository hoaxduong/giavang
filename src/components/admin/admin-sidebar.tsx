'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Users,
  Store,
  MapPin,
  Gem,
  Database,
  RefreshCw,
  ScrollText,
  LayoutDashboard,
  History,
  FileText,
  FolderOpen,
  Tag,
  MessageSquare,
} from 'lucide-react'

const navigation = [
  {
    name: 'Tổng quan',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Người dùng',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Thương hiệu',
    href: '/admin/retailers',
    icon: Store,
  },
  {
    name: 'Tỉnh thành',
    href: '/admin/provinces',
    icon: MapPin,
  },
  {
    name: 'Loại vàng',
    href: '/admin/product-types',
    icon: Gem,
  },
  {
    name: 'Blog',
    icon: FileText,
    children: [
      {
        name: 'Bài viết',
        href: '/admin/blog/posts',
        icon: FileText,
      },
      {
        name: 'Danh mục',
        href: '/admin/blog/categories',
        icon: FolderOpen,
      },
      {
        name: 'Thẻ',
        href: '/admin/blog/tags',
        icon: Tag,
      },
      {
        name: 'Bình luận',
        href: '/admin/blog/comments',
        icon: MessageSquare,
      },
    ],
  },
  {
    name: 'Crawler',
    icon: Database,
    children: [
      {
        name: 'Nguồn dữ liệu',
        href: '/admin/crawler/sources',
        icon: Database,
      },
      {
        name: 'Đồng bộ',
        href: '/admin/crawler/sync',
        icon: RefreshCw,
      },
      {
        name: 'Thu thập lịch sử',
        href: '/admin/crawler/backfill',
        icon: History,
      },
      {
        name: 'Lịch sử',
        href: '/admin/crawler/logs',
        icon: ScrollText,
      },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/10">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Quản trị</h2>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          if (item.children) {
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
                <div className="ml-4 space-y-1">
                  {item.children.map((child) => {
                    const isActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <child.icon className="h-4 w-4" />
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
