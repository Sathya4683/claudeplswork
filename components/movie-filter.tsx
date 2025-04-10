"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search, X, SlidersHorizontal } from "lucide-react"
import type { MovieData } from "@/lib/data-utils"
import Link from "next/link"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { dbClient } from "@/lib/db-service"

export function MovieFilter() {
  const [movies, setMovies] = useState<MovieData[]>([])
  const [filteredMovies, setFilteredMovies] = useState<MovieData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter states
  const [filters, setFilters] = useState({
    genre: "",
    year: "",
    director: "",
    actor: "",
    minRating: 0,
    maxRating: 10,
    language: "",
    country: "",
  })

  // Unique options for select filters
  const [filterOptions, setFilterOptions] = useState({
    genres: new Set<string>(),
    years: new Set<string>(),
    directors: new Set<string>(),
    actors: new Set<string>(),
    languages: new Set<string>(),
    countries: new Set<string>(),
  })

  // Load movies on component mount
  useEffect(() => {
    async function loadMovies() {
      setIsLoading(true)
      try {
        // Use SQL-like query to get all movies
        const data = await dbClient.executeQuery("SELECT * FROM movies ORDER BY imdb_score DESC")
        setMovies(data)
        setFilteredMovies(data) // Show all 30 movies initially

        // Extract filter options
        const options = {
          genres: new Set<string>(),
          years: new Set<string>(),
          directors: new Set<string>(),
          actors: new Set<string>(),
          languages: new Set<string>(),
          countries: new Set<string>(),
        }

        data.forEach((movie) => {
          // Add genres
          movie.genre.split("|").forEach((genre) => {
            if (genre.trim()) options.genres.add(genre.trim())
          })

          // Add year
          if (movie.release_year) options.years.add(movie.release_year.toString())

          // Add director
          if (movie.director_name) options.directors.add(movie.director_name)

          // Add actors
          if (movie.actors) {
            movie.actors.split("|").forEach((actor) => {
              if (actor.trim()) options.actors.add(actor.trim())
            })
          }

          // Add language
          if (movie.language) options.languages.add(movie.language)

          // Add country
          if (movie.country) options.countries.add(movie.country)
        })

        setFilterOptions(options)
      } catch (error) {
        console.error("Error loading movies:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMovies()
  }, [])

  // Apply filters when search query or filters change
  useEffect(() => {
    if (movies.length === 0) return

    let results = [...movies]

    // Apply text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(
        (movie) =>
          movie.movie_name.toLowerCase().includes(query) ||
          movie.director_name.toLowerCase().includes(query) ||
          movie.actors.toLowerCase().includes(query) ||
          movie.plot_keyword.toLowerCase().includes(query),
      )
    }

    // Apply genre filter
    if (filters.genre && filters.genre !== "all") {
      results = results.filter((movie) => movie.genre.toLowerCase().includes(filters.genre.toLowerCase()))
    }

    // Apply year filter
    if (filters.year && filters.year !== "all") {
      results = results.filter((movie) => movie.release_year.toString() === filters.year)
    }

    // Apply director filter
    if (filters.director && filters.director !== "all") {
      results = results.filter((movie) => movie.director_name.toLowerCase().includes(filters.director.toLowerCase()))
    }

    // Apply actor filter
    if (filters.actor && filters.actor !== "all") {
      results = results.filter((movie) => movie.actors.toLowerCase().includes(filters.actor.toLowerCase()))
    }

    // Apply rating filter
    results = results.filter((movie) => {
      const rating = movie.imdb_score
      return rating >= filters.minRating && rating <= filters.maxRating
    })

    // Apply language filter
    if (filters.language && filters.language !== "all") {
      results = results.filter((movie) => movie.language.toLowerCase() === filters.language.toLowerCase())
    }

    // Apply country filter
    if (filters.country && filters.country !== "all") {
      results = results.filter((movie) => movie.country.toLowerCase() === filters.country.toLowerCase())
    }

    // Sort by IMDb score (highest first)
    results.sort((a, b) => b.imdb_score - a.imdb_score)

    setFilteredMovies(results)
  }, [searchQuery, filters, movies])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is already handled by the useEffect
  }

  const handleFilterChange = (name: string, value: any) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const clearFilters = () => {
    setFilters({
      genre: "",
      year: "",
      director: "",
      actor: "",
      minRating: 0,
      maxRating: 10,
      language: "",
      country: "",
    })
    setSearchQuery("")
  }

  const activeFilterCount =
    Object.values(filters).filter((value) => value !== "" && value !== 0 && value !== 10 && value !== "all").length +
    (searchQuery ? 1 : 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <form onSubmit={handleSearch} className="flex w-full max-w-lg items-center space-x-2">
          <Input
            type="text"
            placeholder="Search movies, directors, actors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading}>
            <Search className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Search</span>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Movies</SheetTitle>
                <SheetDescription>Refine your movie search with these filters</SheetDescription>
              </SheetHeader>

              <div className="py-4 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={filters.genre} onValueChange={(value) => handleFilterChange("genre", value)}>
                    <SelectTrigger id="genre">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      {Array.from(filterOptions.genres)
                        .sort()
                        .map((genre) => (
                          <SelectItem key={genre} value={genre}>
                            {genre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Release Year</Label>
                  <Select value={filters.year} onValueChange={(value) => handleFilterChange("year", value)}>
                    <SelectTrigger id="year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {Array.from(filterOptions.years)
                        .sort()
                        .reverse()
                        .map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="director">Director</Label>
                  <Select value={filters.director} onValueChange={(value) => handleFilterChange("director", value)}>
                    <SelectTrigger id="director">
                      <SelectValue placeholder="Select director" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directors</SelectItem>
                      {Array.from(filterOptions.directors)
                        .sort()
                        .map((director) => (
                          <SelectItem key={director} value={director}>
                            {director}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actor">Actor</Label>
                  <Select value={filters.actor} onValueChange={(value) => handleFilterChange("actor", value)}>
                    <SelectTrigger id="actor">
                      <SelectValue placeholder="Select actor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actors</SelectItem>
                      {Array.from(filterOptions.actors)
                        .sort()
                        .map((actor) => (
                          <SelectItem key={actor} value={actor}>
                            {actor}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>IMDb Rating</Label>
                    <span className="text-sm text-muted-foreground">
                      {filters.minRating} - {filters.maxRating}
                    </span>
                  </div>
                  <div className="px-1">
                    <Slider
                      defaultValue={[filters.minRating, filters.maxRating]}
                      min={0}
                      max={10}
                      step={0.1}
                      value={[filters.minRating, filters.maxRating]}
                      onValueChange={([min, max]) => {
                        handleFilterChange("minRating", min)
                        handleFilterChange("maxRating", max)
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={filters.language} onValueChange={(value) => handleFilterChange("language", value)}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {Array.from(filterOptions.languages)
                        .sort()
                        .map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={filters.country} onValueChange={(value) => handleFilterChange("country", value)}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {Array.from(filterOptions.countries)
                        .sort()
                        .map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline" onClick={clearFilters}>
                    Reset Filters
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button>Apply Filters</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </form>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Active filters:</span>
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: {searchQuery}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
              </Badge>
            )}
            {filters.genre && filters.genre !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Genre: {filters.genre}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("genre", "")} />
              </Badge>
            )}
            {filters.year && filters.year !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Year: {filters.year}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("year", "")} />
              </Badge>
            )}
            {filters.director && filters.director !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Director: {filters.director}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("director", "")} />
              </Badge>
            )}
            {filters.actor && filters.actor !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Actor: {filters.actor}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("actor", "")} />
              </Badge>
            )}
            {(filters.minRating > 0 || filters.maxRating < 10) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Rating: {filters.minRating} - {filters.maxRating}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    handleFilterChange("minRating", 0)
                    handleFilterChange("maxRating", 10)
                  }}
                />
              </Badge>
            )}
            {filters.language && filters.language !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Language: {filters.language}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("language", "")} />
              </Badge>
            )}
            {filters.country && filters.country !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Country: {filters.country}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("country", "")} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
              Clear all
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p>Loading movies...</p>
        </div>
      ) : filteredMovies.length > 0 ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Results ({filteredMovies.length})</h3>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMovies.map((movie) => (
              <Link key={movie.movie_id} href={`/movie/${movie.movie_id}`}>
                <Card className="overflow-hidden transition-all hover:shadow-lg h-full">
                  <div className="aspect-video w-full bg-muted relative">
                    <img
                      src={movie.poster_url || "/placeholder.svg"}
                      alt={movie.movie_name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
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
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No movies found</h3>
          <p className="text-muted-foreground mt-1">Try adjusting your filters or search term</p>
          <Button className="mt-4" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
