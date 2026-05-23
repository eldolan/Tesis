"use client"

import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { DashboardGrid } from "@/components/dashboard/dashboard-grid"
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <DashboardGrid />
}
