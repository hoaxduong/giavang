"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "@/components/user/user-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";

export function Header() {
  const { isAuthenticated, loading } = useAuth();
  const { isAdmin } = useRole();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">💰</span>
            <span className="text-xl font-bold">Giá Vàng</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Bảng Giá
            </Link>

            <Link
              href="/cong-cu-tinh-so-vang"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Tính Số Vàng
            </Link>
            <Link
              href="/tinh-gia-von-vang"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Tính Giá Vốn
            </Link>
            <Link
              href="/cong-cu-tinh-lai-lo-vang"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Tính Lãi/Lỗ
            </Link>
            {isAuthenticated && (
              <Link
                href="/tinh-loi-nhuan-vang-dinh-ky"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Danh Mục
              </Link>
            )}
            <Link
              href="/blog"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Blog
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : isAuthenticated ? (
            <>
              <UserMenu />
            </>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/auth/signin">Đăng Nhập</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
