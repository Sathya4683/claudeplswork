"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { MovieFilter } from "@/components/movie-filter"
import { MovieAnalytics } from "@/components/movie-analytics"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold">Movie Insights</h1>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/favorites" className="text-sm font-medium">
              Favorites
            </Link>
            {user && (
              <Link href="/reviews" className="text-sm font-medium">
                My Reviews
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome{user ? `, ${user.username}` : " to Movie Insights"}
            </h2>
            <p className="text-muted-foreground mt-2">
              Explore our extensive movie database with powerful search and filter options.
            </p>
          </div>

          <Tabs defaultValue="search">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="search">Movie Search</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-6">
              <MovieFilter />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <MovieAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2023 Movie Insights. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
