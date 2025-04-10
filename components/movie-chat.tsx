"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Loader2 } from "lucide-react"
import { searchMoviesAction } from "@/app/actions"
import type { MovieData } from "@/lib/data-utils"
import Link from "next/link"

export function MovieChat() {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<MovieData[]>([])
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<Array<{ type: "user" | "system"; content: string }>>([
    {
      type: "system",
      content:
        'Hi! I can help you find movies. Ask me questions like "Show me action movies" or "Find movies directed by Christopher Nolan".',
    },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    // Add user message
    setMessages((prev) => [...prev, { type: "user", content: query }])

    setIsSearching(true)
    try {
      const { results: searchResults, filters } = await searchMoviesAction(query)
      setResults(searchResults)
      setAppliedFilters(filters)

      // Add system response
      const responseMessage =
        searchResults.length > 0
          ? `I found ${searchResults.length} movies matching your query.`
          : "I couldn't find any movies matching your criteria. Try a different search."

      setMessages((prev) => [...prev, { type: "system", content: responseMessage }])
    } catch (error) {
      console.error("Error searching movies:", error)
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          content: "Sorry, there was an error processing your request. Please try again.",
        },
      ])
    } finally {
      setIsSearching(false)
      setQuery("")
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {Object.keys(appliedFilters).length > 0 && (
        <div className="px-4 py-2 border-t">
          <div className="text-sm font-medium mb-2">Applied filters:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(appliedFilters).map(([key, value]) => (
              <Badge key={key} variant="outline">
                {key}: {value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="border-t overflow-y-auto max-h-[400px]">
          <div className="p-4">
            <h3 className="font-medium mb-3">Search Results ({results.length})</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((movie) => (
                <Link key={movie.movie_id} href={`/movie/${movie.movie_id}`}>
                  <Card className="overflow-hidden transition-all hover:shadow-lg h-full">
                    <div className="aspect-video w-full bg-muted relative">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url || "/placeholder.svg"}
                          alt={movie.movie_title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-muted-foreground">Movie Poster</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg line-clamp-1">{movie.movie_title}</h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <span className="line-clamp-1">{movie.genres.replace(/\|/g, ", ")}</span>
                        <span className="mx-2">•</span>
                        <span>{movie.title_year}</span>
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
        </div>
      )}

      <div className="border-t p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about movies (e.g., 'Show me action movies from 2010')"
            disabled={isSearching}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
