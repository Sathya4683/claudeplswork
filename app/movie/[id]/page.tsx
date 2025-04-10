"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Clock, Globe, Star, User, Heart } from "lucide-react"
import { dbClient } from "@/lib/db-service"
import { useAuth } from "@/contexts/auth-context"
import { toggleFavoriteAction, checkFavoriteStatusAction } from "@/app/actions"
import { AddReviewDialog } from "@/components/add-review-dialog"
import { MovieReviews } from "@/components/movie-reviews"
import type { Movie } from "@/lib/db-service"

export default function MoviePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [reviewsKey, setReviewsKey] = useState(0) // Used to force refresh reviews

  useEffect(() => {
    async function loadMovie() {
      try {
        // Use SQL-like query to get the movie
        const result = await dbClient.executeQuery("SELECT * FROM movies WHERE movie_id = ?", [id])
        const foundMovie = result[0]

        if (foundMovie) {
          setMovie(foundMovie)

          // Find similar movies (same genre)
          const genres = foundMovie.genre.split("|")
          const allMovies = await dbClient.executeQuery("SELECT * FROM movies")
          const similar = allMovies
            .filter((m) => m.movie_id !== id && genres.some((genre) => m.genre.includes(genre)))
            .sort((a, b) => b.imdb_score - a.imdb_score)
            .slice(0, 3)

          setSimilarMovies(similar)
        }
      } catch (error) {
        console.error("Error loading movie:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMovie()
  }, [id])

  // Check if movie is in favorites
  useEffect(() => {
    async function checkFavoriteStatus() {
      if (!user || !movie) return

      try {
        const isFav = await checkFavoriteStatusAction(user.id, movie.movie_id)
        setIsFavorite(isFav)
      } catch (error) {
        console.error("Error checking favorite status:", error)
      }
    }

    checkFavoriteStatus()
  }, [user, movie])

  const handleToggleFavorite = async () => {
    if (!user || !movie) return

    setIsTogglingFavorite(true)
    try {
      const newStatus = await toggleFavoriteAction(user.id, movie.movie_id)
      setIsFavorite(newStatus)
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  const handleReviewAdded = () => {
    // Force refresh the reviews list
    setReviewsKey((prev) => prev + 1)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium">Loading movie details...</h2>
        </div>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium">Movie not found</h2>
          <p className="text-muted-foreground mt-2">The movie you're looking for doesn't exist.</p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
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
            {user && (
              <Link href="/reviews" className="text-sm font-medium">
                My Reviews
              </Link>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Logout</Link>
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

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="aspect-video w-full bg-muted relative rounded-lg overflow-hidden">
              <img
                src={movie.poster_url || "/placeholder.svg"}
                alt={movie.movie_name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-start">
                <h1 className="text-3xl font-bold">{movie.movie_name}</h1>
                <div className="flex space-x-2">
                  {user && (
                    <>
                      <Button
                        variant={isFavorite ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleFavorite}
                        disabled={isTogglingFavorite}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                        {isFavorite ? "Favorited" : "Add to Favorites"}
                      </Button>
                      <AddReviewDialog
                        userId={user.id}
                        movieId={movie.movie_id}
                        movieTitle={movie.movie_name}
                        onReviewAdded={handleReviewAdded}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {movie.genre.split("|").map((genre, index) => (
                  <Badge key={index} variant="outline">
                    {genre}
                  </Badge>
                ))}
                <div className="flex items-center text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>{movie.movie_duration} min</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="mr-1 h-4 w-4" />
                  <span>{movie.release_year}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Globe className="mr-1 h-4 w-4" />
                  <span>{movie.country}</span>
                </div>
                <div className="flex items-center">
                  <Star className="mr-1 h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{movie.imdb_score}</span>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">Plot Keywords</h2>
                <div className="flex flex-wrap gap-2">
                  {movie.plot_keyword.split("|").map((keyword, index) => (
                    <Badge key={index} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium">Director</h3>
                    <p className="text-muted-foreground">{movie.director_name || "Unknown"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Language</h3>
                    <p className="text-muted-foreground">{movie.language}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Budget</h3>
                    <p className="text-muted-foreground">${movie.budget ? movie.budget.toLocaleString() : "Unknown"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Content Rating</h3>
                    <p className="text-muted-foreground">{movie.movie_certification || "Unknown"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Tabs defaultValue="cast">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cast">Cast</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                <TabsContent value="cast" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {movie.actors.split("|").map((actor, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-medium">{actor}</h3>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="reviews" className="mt-4">
                  <MovieReviews key={reviewsKey} movieId={movie.movie_id} />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">Similar Movies</h2>
                <div className="space-y-4">
                  {similarMovies.length > 0 ? (
                    similarMovies.map((similarMovie) => (
                      <Link key={similarMovie.movie_id} href={`/movie/${similarMovie.movie_id}`}>
                        <div className="flex items-start gap-3 group">
                          <div className="h-16 w-28 bg-muted rounded flex items-center justify-center overflow-hidden">
                            <img
                              src={similarMovie.poster_url || "/placeholder.svg"}
                              alt={similarMovie.movie_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="font-medium group-hover:text-primary transition-colors">
                              {similarMovie.movie_name}
                            </h3>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span>{similarMovie.release_year}</span>
                              <span className="mx-1">•</span>
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-500 mr-0.5" />
                                <span>{similarMovie.imdb_score}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No similar movies found.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">Director</h2>
                {movie.director_name ? (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium">{movie.director_name}</h3>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No director information available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">Movie Facts</h2>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">IMDb Link:</span>{" "}
                    <a
                      href={`https://www.imdb.com/title/tt${movie.movie_id.padStart(7, "0")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View on IMDb
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
