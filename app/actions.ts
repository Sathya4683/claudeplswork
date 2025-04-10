"use server"

import {
  fetchMovieData,
  searchMovies,
  getRatingDistribution,
  getGenreDistribution,
  getYearDistribution,
  getBudgetRevenueAnalysis,
  getDirectorAnalysis,
  type MovieData,
} from "@/lib/data-utils"
import { dbClient } from "@/lib/db-service"
import { v4 as uuidv4 } from "uuid"

export async function searchMoviesAction(query: string): Promise<{
  results: MovieData[]
  filters: Record<string, string>
}> {
  try {
    // Execute SQL-like query
    const movies = await fetchMovieData()
    const results = searchMovies(movies, query)

    // Extract the filters that were applied
    const filterTerms: Record<string, string> = {}

    if (query.match(/genre/i)) filterTerms.genre = "Extracted from your query"
    if (query.match(/director/i)) filterTerms.director = "Extracted from your query"
    if (query.match(/actor|star|cast/i)) filterTerms.actor = "Extracted from your query"
    if (query.match(/year|released/i)) filterTerms.year = "Extracted from your query"
    if (query.match(/country/i)) filterTerms.country = "Extracted from your query"
    if (query.match(/language/i)) filterTerms.language = "Extracted from your query"
    if (query.match(/keyword|about|plot|theme/i)) filterTerms.keywords = "Extracted from your query"

    return {
      results: results.slice(0, 30), // Limit to 30 results
      filters: filterTerms,
    }
  } catch (error) {
    console.error("Error searching movies:", error)
    return {
      results: [],
      filters: {},
    }
  }
}

export async function getMovieAnalyticsAction() {
  try {
    // Use SQL-like queries for analytics
    return {
      ratingDistribution: await getRatingDistribution(),
      genreDistribution: await getGenreDistribution(),
      yearDistribution: await getYearDistribution(),
      budgetRevenue: await getBudgetRevenueAnalysis(),
      directorAnalysis: await getDirectorAnalysis(),
    }
  } catch (error) {
    console.error("Error getting movie analytics:", error)
    return {
      ratingDistribution: [],
      genreDistribution: [],
      yearDistribution: [],
      budgetRevenue: [],
      directorAnalysis: [],
    }
  }
}

export async function getFavoriteMoviesAction(userId: string): Promise<MovieData[]> {
  try {
    const movies = await fetchMovieData()
    const favoriteIds = await dbClient.getFavorites(userId)

    return movies.filter((movie) => favoriteIds.includes(movie.movie_id))
  } catch (error) {
    console.error("Error fetching favorite movies:", error)
    return []
  }
}

export async function toggleFavoriteAction(userId: string, movieId: string): Promise<boolean> {
  try {
    const favoriteIds = await dbClient.getFavorites(userId)
    const isFavorite = favoriteIds.includes(movieId)

    if (isFavorite) {
      await dbClient.removeFavorite(userId, movieId)
      return false
    } else {
      await dbClient.addFavorite(userId, movieId)
      return true
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    throw new Error("Failed to update favorites")
  }
}

export async function getUserReviewsAction(userId: string) {
  try {
    const movies = await fetchMovieData()
    const reviews = await dbClient.getReviewsByUser(userId)

    return reviews.map((review) => {
      const movie = movies.find((m) => m.movie_id === review.movie_id)
      return {
        ...review,
        movie_title: movie?.movie_name || "Unknown Movie",
        poster_url: movie?.poster_url || null,
      }
    })
  } catch (error) {
    console.error("Error fetching user reviews:", error)
    return []
  }
}

export async function getMovieReviewsAction(movieId: string) {
  try {
    return await dbClient.getReviewsByMovie(movieId)
  } catch (error) {
    console.error("Error fetching movie reviews:", error)
    return []
  }
}

export async function addReviewAction(userId: string, movieId: string, rating: number, content: string) {
  try {
    const reviewId = uuidv4()
    return await dbClient.addReview(reviewId, userId, movieId, rating, content)
  } catch (error) {
    console.error("Error adding review:", error)
    throw new Error("Failed to add review")
  }
}

export async function updateReviewAction(reviewId: string, rating: number, content: string) {
  try {
    await dbClient.updateReview(reviewId, rating, content)
    return { success: true }
  } catch (error) {
    console.error("Error updating review:", error)
    throw new Error("Failed to update review")
  }
}

export async function deleteReviewAction(reviewId: string) {
  try {
    await dbClient.deleteReview(reviewId)
    return { success: true }
  } catch (error) {
    console.error("Error deleting review:", error)
    throw new Error("Failed to delete review")
  }
}

export async function checkFavoriteStatusAction(userId: string, movieId: string): Promise<boolean> {
  try {
    const favoriteIds = await dbClient.getFavorites(userId)
    return favoriteIds.includes(movieId)
  } catch (error) {
    console.error("Error checking favorite status:", error)
    return false
  }
}
