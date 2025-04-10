"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogOut, Star, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getFavoriteMoviesAction } from "@/app/actions"
import type { MovieData } from "@/lib/data-utils"

export default function FavoritesPage() {
  const { user, signOut } = useAuth()
  const [favoriteMovies, setFavoriteMovies] = useState<MovieData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadFavorites() {
      if (!user) return

      setIsLoading(true)
      try {
        const movies = await getFavoriteMoviesAction(user.id)
        setFavoriteMovies(movies)
      } catch (error) {
        console.error("Error loading favorites:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFavorites()
  }, [user])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium">Please log in to view your favorites</h2>
          <Button className="mt-4" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    )
  }

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
            <Link href="/reviews" className="text-sm font-medium">
              My Reviews
            </Link>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Your Favorite Movies</h2>
            <p className="text-muted-foreground mt-2">Movies you've saved to your favorites list.</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p>Loading your favorites...</p>
            </div>
          ) : favoriteMovies.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favoriteMovies.map((movie) => (
                <Link key={movie.movie_id} href={`/movie/${movie.movie_id}`}>
                  <Card className="overflow-hidden transition-all hover:shadow-lg h-full">
                    <div className="aspect-video w-full bg-muted relative">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url || "/placeholder.svg"}
                          alt={movie.movie_name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-muted-foreground">Movie Poster</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg line-clamp-1">{movie.movie_name}</h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <span className="line-clamp-1">{movie.genre.replace(/\|/g, ", ")}</span>
                        <span className="mx-2">•</span>
                        <span>{movie.release_year}</span>
                      </div>
                      <div className="mt-2 flex items-center">
                        <div className="bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded text-xs font-medium">
                          IMDb {movie.imdb_score}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <Star className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No favorites yet</h3>
              <p className="text-muted-foreground mt-1">
                Start adding movies to your favorites list by clicking the star icon on movie pages.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard">Explore Movies</Link>
              </Button>
            </div>
          )}
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
