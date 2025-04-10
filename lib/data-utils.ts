import { dbClient, type Movie } from "./db-service"

export type MovieData = Movie

export async function fetchMovieData(): Promise<MovieData[]> {
  try {
    // Use SQL-like query to get all movies
    const movies = await dbClient.executeQuery("SELECT * FROM movies")
    return movies
  } catch (error) {
    console.error("Error fetching movie data:", error)
    return []
  }
}

export function searchMovies(movies: MovieData[], query: string): MovieData[] {
  // If the query is a direct movie title, prioritize exact matches
  const exactMatch = movies.find((movie) => movie.movie_name.toLowerCase() === query.toLowerCase())

  if (exactMatch) {
    return [exactMatch]
  }

  const filters = parseUserQuery(query)

  // Special handling for actor search
  if (filters.actors) {
    const actorName = filters.actors
    delete filters.actors

    return movies.filter((movie) => {
      // Check if the movie matches all other filters
      const matchesOtherFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true

        const movieValue = movie[key as keyof MovieData]
        if (!movieValue) return false

        if (key === "genre" || key === "plot_keyword") {
          const values = String(movieValue).toLowerCase().split("|")
          return values.some((v) => v.includes(value.toLowerCase()))
        }

        return String(movieValue).toLowerCase().includes(value.toLowerCase())
      })

      if (!matchesOtherFilters) return false

      // Check if actor name matches
      return movie.actors.toLowerCase().includes(actorName.toLowerCase())
    })
  }

  // If the query is just a movie title without any specific filters
  if (filters.movie_name && Object.keys(filters).length === 1) {
    // Do a more flexible search for movie titles
    return movies
      .filter((movie) => movie.movie_name.toLowerCase().includes(filters.movie_name!.toLowerCase()))
      .sort((a, b) => {
        // Sort by relevance - exact matches first, then by title length (shorter titles first)
        const aExact = a.movie_name.toLowerCase() === filters.movie_name!.toLowerCase()
        const bExact = b.movie_name.toLowerCase() === filters.movie_name!.toLowerCase()

        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        // If both are exact or both are partial matches, sort by title length
        return a.movie_name.length - b.movie_name.length
      })
  }

  return filterMovies(movies, filters)
}

export function filterMovies(movies: MovieData[], filters: Partial<Record<keyof MovieData, string>>): MovieData[] {
  return movies.filter((movie) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true

      const movieValue = movie[key as keyof MovieData]
      if (movieValue === undefined) return false

      // Handle special cases for genres and plot_keywords which are pipe-separated
      if (key === "genre" || key === "plot_keyword") {
        const values = String(movieValue).toLowerCase().split("|")
        return values.some((v) => v.includes(value.toLowerCase()))
      }

      return String(movieValue).toLowerCase().includes(value.toLowerCase())
    })
  })
}

export function parseUserQuery(query: string): Partial<Record<keyof MovieData, string>> {
  const filters: Partial<Record<keyof MovieData, string>> = {}

  // Extract genre
  const genreMatch = query.match(/genre(?:s)?\s*(?:is|are|=|:)?\s*["']?([a-zA-Z\s]+)["']?/i)
  if (genreMatch && genreMatch[1]) {
    filters.genre = genreMatch[1].trim()
  }

  // Extract movie title
  const titleMatch = query.match(/(?:movie|film|title)\s*(?:name|called|titled|is|=|:)?\s*["']?([a-zA-Z0-9\s]+)["']?/i)
  if (titleMatch && titleMatch[1]) {
    filters.movie_name = titleMatch[1].trim()
  }

  // Extract director
  const directorMatch = query.match(/director\s*(?:is|=|:)?\s*["']?([a-zA-Z\s]+)["']?/i)
  if (directorMatch && directorMatch[1]) {
    filters.director_name = directorMatch[1].trim()
  }

  // Extract actor
  const actorMatch = query.match(/(?:actor|star|cast)\s*(?:is|=|:)?\s*["']?([a-zA-Z\s]+)["']?/i)
  if (actorMatch && actorMatch[1]) {
    filters.actors = actorMatch[1].trim()
  }

  // Extract year
  const yearMatch = query.match(/(?:year|released|from)\s*(?:in|=|:)?\s*(\d{4})/i)
  if (yearMatch && yearMatch[1]) {
    filters.release_year = yearMatch[1].trim()
  }

  // Extract country
  const countryMatch = query.match(/(?:country|from)\s*(?:is|=|:)?\s*["']?([a-zA-Z\s]+)["']?/i)
  if (countryMatch && countryMatch[1]) {
    filters.country = countryMatch[1].trim()
  }

  // Extract language
  const languageMatch = query.match(/(?:language|in)\s*(?:is|=|:)?\s*["']?([a-zA-Z\s]+)["']?/i)
  if (languageMatch && languageMatch[1]) {
    filters.language = languageMatch[1].trim()
  }

  // Extract keywords
  const keywordMatch = query.match(/(?:keyword|about|plot|theme)\s*(?:is|=|:)?\s*["']?([a-zA-Z\s]+)["']?/i)
  if (keywordMatch && keywordMatch[1]) {
    filters.plot_keyword = keywordMatch[1].trim()
  }

  // If no specific filters were found but there's a query, use it as a general search term
  if (Object.keys(filters).length === 0 && query.trim()) {
    const searchTerm = query.trim()

    // Check if it's a genre
    const commonGenres = [
      "action",
      "comedy",
      "drama",
      "horror",
      "sci-fi",
      "thriller",
      "romance",
      "adventure",
      "fantasy",
    ]
    if (commonGenres.some((genre) => searchTerm.toLowerCase().includes(genre))) {
      filters.genre = searchTerm
    } else {
      // Default to movie title
      filters.movie_name = searchTerm
    }
  }

  return filters
}

// Function to get rating distribution for charts
export async function getRatingDistribution(): Promise<{ rating: string; count: number }[]> {
  return dbClient.getRatingDistribution()
}

// Function to get genre distribution for charts
export async function getGenreDistribution(): Promise<{ genre: string; count: number }[]> {
  return dbClient.getGenreDistribution()
}

// Function to get year distribution for charts
export async function getYearDistribution(): Promise<{ year: string; count: number; avgRating: number }[]> {
  return dbClient.getYearDistribution()
}

// Function to get budget vs. revenue analysis
export async function getBudgetRevenueAnalysis(): Promise<any[]> {
  return dbClient.getBudgetRevenueAnalysis()
}

// Function to get director performance analysis
export async function getDirectorAnalysis(): Promise<any[]> {
  return dbClient.getDirectorAnalysis()
}
