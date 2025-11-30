import { SignUpForm } from '@/components/auth/signup-form'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2">
            <span className="text-3xl font-bold text-primary">💰</span>
            <span className="text-2xl font-bold">Giá Vàng</span>
          </Link>
        </div>
        <SignUpForm />
      </div>
    </div>
  )
}

