"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getRatingDistribution,
  getGenreDistribution,
  getYearDistribution,
  getBudgetRevenueAnalysis,
  getDirectorAnalysis,
} from "@/lib/data-utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  LabelList,
} from "recharts"

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
]

export function MovieAnalytics() {
  const [analytics, setAnalytics] = useState<{
    ratingDistribution: { rating: string; count: number }[]
    genreDistribution: { genre: string; count: number }[]
    yearDistribution: { year: string; count: number; avgRating: number }[]
    budgetRevenue: { title: string; budget: number; revenue: number; profit: number; roi: number }[]
    directorAnalysis: { director: string; movieCount: number; avgRating: number; totalRevenue: number }[]
  }>({
    ratingDistribution: [],
    genreDistribution: [],
    yearDistribution: [],
    budgetRevenue: [],
    directorAnalysis: [],
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadAnalytics() {
      try {
        // Use SQL-like queries for analytics
        setAnalytics({
          ratingDistribution: await getRatingDistribution(),
          genreDistribution: await getGenreDistribution(),
          yearDistribution: await getYearDistribution(),
          budgetRevenue: await getBudgetRevenueAnalysis(),
          directorAnalysis: await getDirectorAnalysis(),
        })
      } catch (error) {
        console.error("Error loading analytics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movie Analytics</CardTitle>
          <CardDescription>Loading analytics data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Format currency for tooltips
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Movie Analytics</CardTitle>
        <CardDescription>Insights from our movie database</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ratings">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ratings">Rating Distribution</TabsTrigger>
            <TabsTrigger value="genres">Top Genres</TabsTrigger>
            <TabsTrigger value="years">Ratings by Year</TabsTrigger>
            <TabsTrigger value="budget">Budget vs Revenue</TabsTrigger>
            <TabsTrigger value="directors">Top Directors</TabsTrigger>
          </TabsList>

          <TabsContent value="ratings" className="pt-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.ratingDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`${value} movies`, "Count"]}
                    labelFormatter={(label) => `Rating: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Number of Movies" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              SQL Query: SELECT COUNT(*) FROM movies GROUP BY ROUND(imdb_score * 2) / 2
            </p>
          </TabsContent>

          <TabsContent value="genres" className="pt-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.genreDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="genre"
                    label={({ genre, count, percent }) => `${genre}: ${count} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {analytics.genreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} movies`, "Count"]}
                    labelFormatter={(label) => `Genre: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              SQL Query: SELECT COUNT(*) FROM movies GROUP BY genre
            </p>
          </TabsContent>

          <TabsContent value="years" className="pt-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.yearDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tickFormatter={(value) => value} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "Average Rating") return [`${value.toFixed(1)}/10`, name]
                      return [`${value} movies`, name]
                    }}
                    labelFormatter={(label) => `Year: ${label}`}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    name="Number of Movies"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="avgRating" name="Average Rating" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              SQL Query: SELECT COUNT(*), AVG(imdb_score) FROM movies GROUP BY release_year
            </p>
          </TabsContent>

          <TabsContent value="budget" className="pt-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid />
                  <XAxis
                    type="number"
                    dataKey="budget"
                    name="Budget"
                    unit="$"
                    domain={["auto", "auto"]}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    label={{ value: "Budget (millions $)", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="revenue"
                    name="Revenue"
                    unit="$"
                    domain={["auto", "auto"]}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    label={{ value: "Revenue (millions $)", angle: -90, position: "insideLeft" }}
                  />
                  <ZAxis type="number" dataKey="roi" range={[50, 400]} name="ROI" unit="%" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value: any, name: string) => {
                      if (name === "Budget" || name === "Revenue") {
                        return [formatCurrency(value), name]
                      }
                      if (name === "ROI") {
                        return [`${value}%`, "Return on Investment"]
                      }
                      return [value, name]
                    }}
                    labelFormatter={(label) => null}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-background p-2 border rounded shadow-sm">
                            <p className="font-bold">{data.title}</p>
                            <p>Budget: {formatCurrency(data.budget)}</p>
                            <p>Revenue: {formatCurrency(data.revenue)}</p>
                            <p>Profit: {formatCurrency(data.profit)}</p>
                            <p>ROI: {data.roi}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Scatter name="Movies" data={analytics.budgetRevenue} fill="#8884d8" shape="circle" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              SQL Query: SELECT movie_name, budget FROM movies
            </p>
          </TabsContent>

          <TabsContent value="directors" className="pt-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.directorAnalysis}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis
                    type="category"
                    dataKey="director"
                    width={80}
                    tickFormatter={(value) => (value.length > 12 ? `${value.substring(0, 12)}...` : value)}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "Average Rating") return [`${value.toFixed(1)}/10`, name]
                      if (name === "Movie Count") return [`${value} movies`, name]
                      if (name === "Total Revenue") return [formatCurrency(value), name]
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgRating" name="Average Rating" fill="#8884d8">
                    <LabelList dataKey="avgRating" position="right" formatter={(value: number) => value.toFixed(1)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              SQL Query: SELECT director_name, COUNT(*), AVG(imdb_score) FROM movies GROUP BY director_name
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
