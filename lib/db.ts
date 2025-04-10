// Types
export type UserProfile = {
  id: string
  email: string
  username: string
  password?: string
  created_at: string
  last_login: string
}

export type Favorite = {
  user_id: string
  movie_id: string
  added_at: string
}

export type Review = {
  id: string
  user_id: string
  movie_id: string
  rating: number
  content: string
  created_at: string
  username?: string
}

// Initialize localStorage if needed
function initializeStorage() {
  if (typeof window === "undefined") return false

  if (!localStorage.getItem("movie_insights_users")) {
    localStorage.setItem("movie_insights_users", JSON.stringify([]))
  }
  if (!localStorage.getItem("movie_insights_favorites")) {
    localStorage.setItem("movie_insights_favorites", JSON.stringify([]))
  }
  if (!localStorage.getItem("movie_insights_reviews")) {
    localStorage.setItem("movie_insights_reviews", JSON.stringify([]))
  }
  return true
}

// User functions
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  if (!initializeStorage()) return null

  const users = JSON.parse(localStorage.getItem("movie_insights_users") || "[]") as UserProfile[]
  return users.find((user) => user.email === email) || null
}

export async function createUser(id: string, email: string, username: string, password: string): Promise<UserProfile> {
  if (!initializeStorage()) throw new Error("Storage not available")

  const users = JSON.parse(localStorage.getItem("movie_insights_users") || "[]") as UserProfile[]
  const now = new Date().toISOString()

  const newUser: UserProfile = {
    id,
    email,
    username,
    password,
    created_at: now,
    last_login: now,
  }

  users.push(newUser)
  localStorage.setItem("movie_insights_users", JSON.stringify(users))

  return newUser
}

export async function updateLastLogin(userId: string): Promise<void> {
  if (!initializeStorage()) return

  const users = JSON.parse(localStorage.getItem("movie_insights_users") || "[]") as UserProfile[]
  const now = new Date().toISOString()

  const updatedUsers = users.map((user) => {
    if (user.id === userId) {
      return { ...user, last_login: now }
    }
    return user
  })

  localStorage.setItem("movie_insights_users", JSON.stringify(updatedUsers))
}

// Favorites functions
export async function getFavorites(userId: string): Promise<Favorite[]> {
  if (!initializeStorage()) return []

  const favorites = JSON.parse(localStorage.getItem("movie_insights_favorites") || "[]") as Favorite[]
  return favorites.filter((fav) => fav.user_id === userId)
}

export async function addFavorite(userId: string, movieId: string): Promise<void> {
  if (!initializeStorage()) return

  const favorites = JSON.parse(localStorage.getItem("movie_insights_favorites") || "[]") as Favorite[]
  const now = new Date().toISOString()

  // Check if already exists
  const exists = favorites.some((fav) => fav.user_id === userId && fav.movie_id === movieId)
  if (!exists) {
    favorites.push({
      user_id: userId,
      movie_id: movieId,
      added_at: now,
    })
    localStorage.setItem("movie_insights_favorites", JSON.stringify(favorites))
  }
}

export async function removeFavorite(userId: string, movieId: string): Promise<void> {
  if (!initializeStorage()) return

  const favorites = JSON.parse(localStorage.getItem("movie_insights_favorites") || "[]") as Favorite[]
  const updatedFavorites = favorites.filter((fav) => !(fav.user_id === userId && fav.movie_id === movieId))

  localStorage.setItem("movie_insights_favorites", JSON.stringify(updatedFavorites))
}

// Reviews functions
export async function getReviewsByUser(userId: string): Promise<Review[]> {
  if (!initializeStorage()) return []

  const reviews = JSON.parse(localStorage.getItem("movie_insights_reviews") || "[]") as Review[]
  return reviews.filter((review) => review.user_id === userId)
}

export async function getReviewsByMovie(movieId: string): Promise<Review[]> {
  if (!initializeStorage()) return []

  const reviews = JSON.parse(localStorage.getItem("movie_insights_reviews") || "[]") as Review[]
  const users = JSON.parse(localStorage.getItem("movie_insights_users") || "[]") as UserProfile[]

  return reviews
    .filter((review) => review.movie_id === movieId)
    .map((review) => {
      const user = users.find((u) => u.id === review.user_id)
      return {
        ...review,
        username: user?.username || "Unknown User",
      }
    })
}

export async function addReview(
  id: string,
  userId: string,
  movieId: string,
  rating: number,
  content: string,
): Promise<Review> {
  if (!initializeStorage()) throw new Error("Storage not available")

  const reviews = JSON.parse(localStorage.getItem("movie_insights_reviews") || "[]") as Review[]
  const now = new Date().toISOString()

  const newReview: Review = {
    id,
    user_id: userId,
    movie_id: movieId,
    rating,
    content,
    created_at: now,
  }

  reviews.push(newReview)
  localStorage.setItem("movie_insights_reviews", JSON.stringify(reviews))

  return newReview
}

export async function updateReview(id: string, rating: number, content: string): Promise<void> {
  if (!initializeStorage()) return

  const reviews = JSON.parse(localStorage.getItem("movie_insights_reviews") || "[]") as Review[]

  const updatedReviews = reviews.map((review) => {
    if (review.id === id) {
      return { ...review, rating, content }
    }
    return review
  })

  localStorage.setItem("movie_insights_reviews", JSON.stringify(updatedReviews))
}

export async function deleteReview(id: string): Promise<void> {
  if (!initializeStorage()) return

  const reviews = JSON.parse(localStorage.getItem("movie_insights_reviews") || "[]") as Review[]
  const updatedReviews = reviews.filter((review) => review.id !== id)

  localStorage.setItem("movie_insights_reviews", JSON.stringify(updatedReviews))
}

// Export all functions directly
export const dbClient = {
  getUserByEmail,
  createUser,
  updateLastLogin,
  getFavorites,
  addFavorite,
  removeFavorite,
  getReviewsByUser,
  getReviewsByMovie,
  addReview,
  updateReview,
  deleteReview,
}
