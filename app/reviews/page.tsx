"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogOut, ArrowLeft, Star, Edit, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getUserReviewsAction, deleteReviewAction } from "@/app/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Review {
  id: string
  user_id: string
  movie_id: string
  rating: number
  content: string
  created_at: string
  movie_title: string
  poster_url: string | null
}

export default function ReviewsPage() {
  const { user, signOut } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadReviews() {
      if (!user) return

      setIsLoading(true)
      try {
        const data = await getUserReviewsAction(user.id)
        setReviews(data)
      } catch (error) {
        console.error("Error loading reviews:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadReviews()
  }, [user])

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReviewAction(reviewId)
      setReviews(reviews.filter((review) => review.id !== reviewId))
    } catch (error) {
      console.error("Error deleting review:", error)
      alert("Failed to delete review. Please try again.")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium">Please log in to view your reviews</h2>
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
            <h2 className="text-3xl font-bold tracking-tight">Your Reviews</h2>
            <p className="text-muted-foreground mt-2">Reviews you've written for movies.</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p>Loading your reviews...</p>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
                <Card key={review.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-48 h-48 bg-muted relative">
                        {review.poster_url ? (
                          <img
                            src={review.poster_url || "/placeholder.svg"}
                            alt={review.movie_title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-muted-foreground">Movie Poster</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-semibold">
                              <Link href={`/movie/${review.movie_id}`} className="hover:underline">
                                {review.movie_title}
                              </Link>
                            </h3>
                            <div className="flex items-center mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {formatDate(review.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/movie/${review.movie_id}`}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit Review</span>
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">Delete Review</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Review</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete your review for "{review.movie_title}"? This action
                                    cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteReview(review.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <p className="mt-4">{review.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <Star className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No reviews yet</h3>
              <p className="text-muted-foreground mt-1">
                You haven't written any reviews yet. Start by reviewing a movie you've watched.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard">Browse Movies</Link>
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
