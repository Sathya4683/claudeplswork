import { openDB, type DBSchema, type IDBPDatabase } from "idb"

// Define the database schema
interface MovieDBSchema extends DBSchema {
  movies: {
    key: string
    value: Movie
    indexes: {
      "by-genre": string
      "by-year": number
      "by-score": number
      "by-director": string
    }
  }
  reviews: {
    key: string
    value: Review
    indexes: {
      "by-movie": string
      "by-user": string
    }
  }
  favorites: {
    key: string
    value: Favorite
    indexes: {
      "by-user": string
    }
  }
  users: {
    key: string
    value: User
    indexes: {
      "by-email": string
    }
  }
}

// Define the movie type according to the schema
export interface Movie {
  movie_id: string
  movie_name: string
  movie_duration: number
  plot_keyword: string
  language: string
  country: string
  budget: number
  release_year: number
  imdb_score: number
  movie_certification: string
  genre: string
  producer_name: string
  award_name: string
  director_name: string
  actors: string
  reviewer_name: string
  songs: string
  poster_url?: string
}

export interface Review {
  id: string
  user_id: string
  movie_id: string
  rating: number
  content: string
  created_at: string
  username?: string
}

export interface Favorite {
  user_id: string
  movie_id: string
  added_at: string
}

export interface User {
  id: string
  email: string
  username: string
  password: string
  created_at: string
  last_login: string
}

// Database singleton
let db: IDBPDatabase<MovieDBSchema> | null = null

// Initialize the database
export async function getDB() {
  if (db) return db

  db = await openDB<MovieDBSchema>("movie-insights-db", 1, {
    upgrade(db) {
      // Create movies store with indexes
      const movieStore = db.createObjectStore("movies", { keyPath: "movie_id" })
      movieStore.createIndex("by-genre", "genre")
      movieStore.createIndex("by-year", "release_year")
      movieStore.createIndex("by-score", "imdb_score")
      movieStore.createIndex("by-director", "director_name")

      // Create reviews store with indexes
      const reviewStore = db.createObjectStore("reviews", { keyPath: "id" })
      reviewStore.createIndex("by-movie", "movie_id")
      reviewStore.createIndex("by-user", "user_id")

      // Create favorites store with indexes
      const favoriteStore = db.createObjectStore("favorites", {
        keyPath: ["user_id", "movie_id"],
      })
      favoriteStore.createIndex("by-user", "user_id")

      // Create users store with indexes
      const userStore = db.createObjectStore("users", { keyPath: "id" })
      userStore.createIndex("by-email", "email", { unique: true })
    },
  })

  // Initialize with movie data if empty
  const count = await db.count("movies")
  if (count === 0) {
    await initializeMovieData(db)
  }

  return db
}

// SQL-like query functions
export async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
  const db = await getDB()

  // Parse the query to determine what to do
  if (query.toLowerCase().includes("select") && query.toLowerCase().includes("from movies")) {
    return executeSelectQuery(db, query, params)
  }

  throw new Error(`Unsupported query: ${query}`)
}

async function executeSelectQuery(db: IDBPDatabase<MovieDBSchema>, query: string, params: any[]): Promise<any[]> {
  // Very basic SQL parser - in a real app, use a proper SQL parser
  const lowerQuery = query.toLowerCase()

  // Count query
  if (lowerQuery.includes("select count")) {
    if (lowerQuery.includes("where genre =")) {
      const genre = params[0] || extractStringParam(query, "genre =")
      const movies = await db.getAllFromIndex("movies", "by-genre", genre)
      return [{ count: movies.length }]
    }

    if (lowerQuery.includes("group by genre")) {
      const allMovies = await db.getAll("movies")
      const genreCounts: Record<string, number> = {}

      allMovies.forEach((movie) => {
        movie.genre.split("|").forEach((g) => {
          const genre = g.trim()
          genreCounts[genre] = (genreCounts[genre] || 0) + 1
        })
      })

      return Object.entries(genreCounts).map(([genre, count]) => ({ genre, count }))
    }

    if (lowerQuery.includes("group by release_year")) {
      const allMovies = await db.getAll("movies")
      const yearCounts: Record<number, number> = {}

      allMovies.forEach((movie) => {
        yearCounts[movie.release_year] = (yearCounts[movie.release_year] || 0) + 1
      })

      return Object.entries(yearCounts).map(([year, count]) => ({
        year: Number.parseInt(year),
        count,
        avgRating: calculateAvgRatingByYear(allMovies, Number.parseInt(year)),
      }))
    }

    // Default count all
    const count = await db.count("movies")
    return [{ count }]
  }

  // Select all movies
  if (lowerQuery.includes("select * from movies")) {
    // With where clause
    if (lowerQuery.includes("where")) {
      if (lowerQuery.includes("where genre =")) {
        const genre = params[0] || extractStringParam(query, "genre =")
        return db.getAllFromIndex("movies", "by-genre", genre)
      }

      if (lowerQuery.includes("where release_year =")) {
        const year = params[0] || extractNumberParam(query, "release_year =")
        return db.getAllFromIndex("movies", "by-year", year)
      }

      if (lowerQuery.includes("where director_name =")) {
        const director = params[0] || extractStringParam(query, "director_name =")
        return db.getAllFromIndex("movies", "by-director", director)
      }

      if (lowerQuery.includes("where movie_id =")) {
        const id = params[0] || extractStringParam(query, "movie_id =")
        const movie = await db.get("movies", id)
        return movie ? [movie] : []
      }
    }

    // Order by
    if (lowerQuery.includes("order by imdb_score desc")) {
      const allMovies = await db.getAll("movies")
      return allMovies.sort((a, b) => b.imdb_score - a.imdb_score)
    }

    // Default return all
    return db.getAll("movies")
  }

  // Fallback to getting all movies
  return db.getAll("movies")
}

// Helper functions for query parsing
function extractStringParam(query: string, marker: string): string {
  const regex = new RegExp(`${marker}\\s*['"]([^'"]+)['"]`)
  const match = query.match(regex)
  return match ? match[1] : ""
}

function extractNumberParam(query: string, marker: string): number {
  const regex = new RegExp(`${marker}\\s*(\\d+)`)
  const match = query.match(regex)
  return match ? Number.parseInt(match[1]) : 0
}

function calculateAvgRatingByYear(movies: Movie[], year: number): number {
  const yearMovies = movies.filter((m) => m.release_year === year)
  if (yearMovies.length === 0) return 0

  const sum = yearMovies.reduce((acc, movie) => acc + movie.imdb_score, 0)
  return Number.parseFloat((sum / yearMovies.length).toFixed(1))
}

// Initialize with 30 real movies
async function initializeMovieData(db: IDBPDatabase<MovieDBSchema>) {
  const movies: Movie[] = [
    {
      movie_id: "1",
      movie_name: "The Shawshank Redemption",
      movie_duration: 142,
      plot_keyword: "prison|friendship|escape|redemption|hope",
      language: "English",
      country: "USA",
      budget: 25000000,
      release_year: 1994,
      imdb_score: 9.3,
      movie_certification: "R",
      genre: "Drama",
      producer_name: "Niki Marvin",
      award_name: "Academy Award Nominations for Best Picture",
      director_name: "Frank Darabont",
      actors: "Tim Robbins|Morgan Freeman|Bob Gunton",
      reviewer_name: "Roger Ebert",
      songs: "None",
      poster_url: "https://via.placeholder.com/300x450/483D8B/FFFFFF?text=The+Shawshank+Redemption+(1994)",
    },
    {
      movie_id: "2",
      movie_name: "The Godfather",
      movie_duration: 175,
      plot_keyword: "mafia|family|power|crime|loyalty",
      language: "English",
      country: "USA",
      budget: 6000000,
      release_year: 1972,
      imdb_score: 9.2,
      movie_certification: "R",
      genre: "Crime|Drama",
      producer_name: "Albert S. Ruddy",
      award_name: "Academy Award for Best Picture",
      director_name: "Francis Ford Coppola",
      actors: "Marlon Brando|Al Pacino|James Caan",
      reviewer_name: "Roger Ebert",
      songs: "The Godfather Theme",
      poster_url: "https://via.placeholder.com/300x450/2F4F4F/FFFFFF?text=The+Godfather+(1972)",
    },
    {
      movie_id: "3",
      movie_name: "Pulp Fiction",
      movie_duration: 154,
      plot_keyword: "crime|violence|redemption|drugs|hitman",
      language: "English",
      country: "USA",
      budget: 8000000,
      release_year: 1994,
      imdb_score: 8.9,
      movie_certification: "R",
      genre: "Crime|Drama",
      producer_name: "Lawrence Bender",
      award_name: "Academy Award for Best Original Screenplay",
      director_name: "Quentin Tarantino",
      actors: "John Travolta|Samuel L. Jackson|Uma Thurman",
      reviewer_name: "Roger Ebert",
      songs: "Misirlou|Son of a Preacher Man",
      poster_url: "https://via.placeholder.com/300x450/2F4F4F/FFFFFF?text=Pulp+Fiction+(1994)",
    },
    {
      movie_id: "4",
      movie_name: "The Dark Knight",
      movie_duration: 152,
      plot_keyword: "batman|joker|crime|vigilante|chaos",
      language: "English",
      country: "USA",
      budget: 185000000,
      release_year: 2008,
      imdb_score: 9.0,
      movie_certification: "PG-13",
      genre: "Action|Crime|Drama",
      producer_name: "Christopher Nolan",
      award_name: "Academy Award for Best Supporting Actor",
      director_name: "Christopher Nolan",
      actors: "Christian Bale|Heath Ledger|Aaron Eckhart",
      reviewer_name: "Roger Ebert",
      songs: "None",
      poster_url: "https://via.placeholder.com/300x450/8B0000/FFFFFF?text=The+Dark+Knight+(2008)",
    },
    {
      movie_id: "5",
      movie_name: "Inception",
      movie_duration: 148,
      plot_keyword: "dream|heist|subconscious|reality|memory",
      language: "English",
      country: "USA",
      budget: 160000000,
      release_year: 2010,
      imdb_score: 8.8,
      movie_certification: "PG-13",
      genre: "Action|Adventure|Sci-Fi",
      producer_name: "Christopher Nolan",
      award_name: "Academy Award for Best Visual Effects",
      director_name: "Christopher Nolan",
      actors: "Leonardo DiCaprio|Joseph Gordon-Levitt|Ellen Page",
      reviewer_name: "Roger Ebert",
      songs: "Time",
      poster_url: "https://via.placeholder.com/300x450/00008B/FFFFFF?text=Inception+(2010)",
    },
    {
      movie_id: "6",
      movie_name: "Parasite",
      movie_duration: 132,
      plot_keyword: "class|poverty|wealth|deception|family",
      language: "Korean",
      country: "South Korea",
      budget: 11400000,
      release_year: 2019,
      imdb_score: 8.6,
      movie_certification: "R",
      genre: "Comedy|Drama|Thriller",
      producer_name: "Kwak Sin-ae",
      award_name: "Academy Award for Best Picture",
      director_name: "Bong Joon Ho",
      actors: "Song Kang-ho|Lee Sun-kyun|Cho Yeo-jeong",
      reviewer_name: "A.O. Scott",
      songs: "None",
      poster_url: "https://via.placeholder.com/300x450/4B0082/FFFFFF?text=Parasite+(2019)",
    },
    {
      movie_id: "7",
      movie_name: "The Matrix",
      movie_duration: 136,
      plot_keyword: "virtual reality|dystopia|artificial intelligence|cyberpunk|rebellion",
      language: "English",
      country: "USA",
      budget: 63000000,
      release_year: 1999,
      imdb_score: 8.7,
      movie_certification: "R",
      genre: "Action|Sci-Fi",
      producer_name: "Joel Silver",
      award_name: "Academy Award for Best Visual Effects",
      director_name: "Lana and Lilly Wachowski",
      actors: "Keanu Reeves|Laurence Fishburne|Carrie-Anne Moss",
      reviewer_name: "Roger Ebert",
      songs: "Clubbed to Death",
      poster_url: "https://via.placeholder.com/300x450/00008B/FFFFFF?text=The+Matrix+(1999)",
    },
    {
      movie_id: "8",
      movie_name: "Forrest Gump",
      movie_duration: 142,
      plot_keyword: "life|love|history|innocence|destiny",
      language: "English",
      country: "USA",
      budget: 55000000,
      release_year: 1994,
      imdb_score: 8.8,
      movie_certification: "PG-13",
      genre: "Drama|Romance",
      producer_name: "Wendy Finerman",
      award_name: "Academy Award for Best Picture",
      director_name: "Robert Zemeckis",
      actors: "Tom Hanks|Robin Wright|Gary Sinise",
      reviewer_name: "Roger Ebert",
      songs: "Fortunate Son|Free Bird",
      poster_url: "https://via.placeholder.com/300x450/483D8B/FFFFFF?text=Forrest+Gump+(1994)",
    },
    {
      movie_id: "9",
      movie_name: "Goodfellas",
      movie_duration: 146,
      plot_keyword: "mafia|crime|gangster|violence|betrayal",
      language: "English",
      country: "USA",
      budget: 25000000,
      release_year: 1990,
      imdb_score: 8.7,
      movie_certification: "R",
      genre: "Biography|Crime|Drama",
      producer_name: "Irwin Winkler",
      award_name: "Academy Award for Best Supporting Actor",
      director_name: "Martin Scorsese",
      actors: "Robert De Niro|Ray Liotta|Joe Pesci",
      reviewer_name: "Roger Ebert",
      songs: "Layla|Gimme Shelter",
      poster_url: "https://via.placeholder.com/300x450/2F4F4F/FFFFFF?text=Goodfellas+(1990)",
    },
    {
      movie_id: "10",
      movie_name: "The Lord of the Rings: The Return of the King",
      movie_duration: 201,
      plot_keyword: "fantasy|quest|war|friendship|courage",
      language: "English",
      country: "New Zealand",
      budget: 94000000,
      release_year: 2003,
      imdb_score: 8.9,
      movie_certification: "PG-13",
      genre: "Action|Adventure|Fantasy",
      producer_name: "Peter Jackson",
      award_name: "Academy Award for Best Picture",
      director_name: "Peter Jackson",
      actors: "Elijah Wood|Viggo Mortensen|Ian McKellen",
      reviewer_name: "Roger Ebert",
      songs: "Into the West",
      poster_url: "https://via.placeholder.com/300x450/006400/FFFFFF?text=The+Lord+of+the+Rings+(2003)",
    },
    {
      movie_id: "11",
      movie_name: "Fight Club",
      movie_duration: 139,
      plot_keyword: "identity|consumerism|anarchy|mental illness|rebellion",
      language: "English",
      country: "USA",
      budget: 63000000,
      release_year: 1999,
      imdb_score: 8.8,
      movie_certification: "R",
      genre: "Drama",
      producer_name: "Art Linson",
      award_name: "None",
      director_name: "David Fincher",
      actors: "Brad Pitt|Edward Norton|Helena Bonham Carter",
      reviewer_name: "Roger Ebert",
      songs: "Where Is My Mind",
      poster_url: "https://via.placeholder.com/300x450/483D8B/FFFFFF?text=Fight+Club+(1999)",
    },
    {
      movie_id: "12",
      movie_name: "Interstellar",
      movie_duration: 169,
      plot_keyword: "space|time|love|survival|wormhole",
      language: "English",
      country: "USA",
      budget: 165000000,
      release_year: 2014,
      imdb_score: 8.6,
      movie_certification: "PG-13",
      genre: "Adventure|Drama|Sci-Fi",
      producer_name: "Christopher Nolan",
      award_name: "Academy Award for Best Visual Effects",
      director_name: "Christopher Nolan",
      actors: "Matthew McConaughey|Anne Hathaway|Jessica Chastain",
      reviewer_name: "Roger Ebert",
      songs: "None",
      poster_url: "https://via.placeholder.com/300x450/00008B/FFFFFF?text=Interstellar+(2014)",
    },
    {
      movie_id: "13",
      movie_name: "The Silence of the Lambs",
      movie_duration: 118,
      plot_keyword: "serial killer|fbi|psychological|cannibal|investigation",
      language: "English",
      country: "USA",
      budget: 19000000,
      release_year: 1991,
      imdb_score: 8.6,
      movie_certification: "R",
      genre: "Crime|Drama|Thriller",
      producer_name: "Edward Saxon",
      award_name: "Academy Award for Best Picture",
      director_name: "Jonathan Demme",
      actors: "Jodie Foster|Anthony Hopkins|Scott Glenn",
      reviewer_name: "Roger Ebert",
      songs: "Goodbye Horses",
      poster_url: "https://via.placeholder.com/300x450/800000/FFFFFF?text=The+Silence+of+the+Lambs+(1991)",
    },
    {
      movie_id: "14",
      movie_name: "Schindler's List",
      movie_duration: 195,
      plot_keyword: "holocaust|world war ii|rescue|genocide|heroism",
      language: "English",
      country: "USA",
      budget: 22000000,
      release_year: 1993,
      imdb_score: 8.9,
      movie_certification: "R",
      genre: "Biography|Drama|History",
      producer_name: "Steven Spielberg",
      award_name: "Academy Award for Best Picture",
      director_name: "Steven Spielberg",
      actors: "Liam Neeson|Ralph Fiennes|Ben Kingsley",
      reviewer_name: "Roger Ebert",
      songs: "Theme from Schindler's List",
      poster_url: "https://via.placeholder.com/300x450/000000/FFFFFF?text=Schindler's+List+(1993)",
    },
    {
      movie_id: "15",
      movie_name: "Whiplash",
      movie_duration: 106,
      plot_keyword: "music|ambition|teacher|student|jazz",
      language: "English",
      country: "USA",
      budget: 3300000,
      release_year: 2014,
      imdb_score: 8.5,
      movie_certification: "R",
      genre: "Drama|Music",
      producer_name: "Jason Blum",
      award_name: "Academy Award for Best Supporting Actor",
      director_name: "Damien Chazelle",
      actors: "Miles Teller|J.K. Simmons|Melissa Benoist",
      reviewer_name: "A.O. Scott",
      songs: "Caravan|Whiplash",
      poster_url: "https://via.placeholder.com/300x450/FF1493/FFFFFF?text=Whiplash+(2014)",
    },
    {
      movie_id: "16",
      movie_name: "The Departed",
      movie_duration: 151,
      plot_keyword: "undercover|police|gangster|identity|betrayal",
      language: "English",
      country: "USA",
      budget: 90000000,
      release_year: 2006,
      imdb_score: 8.5,
      movie_certification: "R",
      genre: "Crime|Drama|Thriller",
      producer_name: "Graham King",
      award_name: "Academy Award for Best Picture",
      director_name: "Martin Scorsese",
      actors: "Leonardo DiCaprio|Matt Damon|Jack Nicholson",
      reviewer_name: "Roger Ebert",
      songs: "Gimme Shelter|I'm Shipping Up to Boston",
      poster_url: "https://via.placeholder.com/300x450/2F4F4F/FFFFFF?text=The+Departed+(2006)",
    },
    {
      movie_id: "17",
      movie_name: "Gladiator",
      movie_duration: 155,
      plot_keyword: "revenge|ancient rome|gladiator|betrayal|honor",
      language: "English",
      country: "USA",
      budget: 103000000,
      release_year: 2000,
      imdb_score: 8.5,
      movie_certification: "R",
      genre: "Action|Adventure|Drama",
      producer_name: "Douglas Wick",
      award_name: "Academy Award for Best Picture",
      director_name: "Ridley Scott",
      actors: "Russell Crowe|Joaquin Phoenix|Connie Nielsen",
      reviewer_name: "Roger Ebert",
      songs: "Now We Are Free",
      poster_url: "https://via.placeholder.com/300x450/8B0000/FFFFFF?text=Gladiator+(2000)",
    },
    {
      movie_id: "18",
      movie_name: "The Prestige",
      movie_duration: 130,
      plot_keyword: "magic|rivalry|obsession|deception|sacrifice",
      language: "English",
      country: "USA",
      budget: 40000000,
      release_year: 2006,
      imdb_score: 8.5,
      movie_certification: "PG-13",
      genre: "Drama|Mystery|Sci-Fi",
      producer_name: "Christopher Nolan",
      award_name: "Academy Award Nominations for Best Cinematography",
      director_name: "Christopher Nolan",
      actors: "Christian Bale|Hugh Jackman|Scarlett Johansson",
      reviewer_name: "Roger Ebert",
      songs: "None",
      poster_url: "https://via.placeholder.com/300x450/4B0082/FFFFFF?text=The+Prestige+(2006)",
    },
    {
      movie_id: "19",
      movie_name: "The Lion King",
      movie_duration: 88,
      plot_keyword: "lion|kingdom|betrayal|coming of age|responsibility",
      language: "English",
      country: "USA",
      budget: 45000000,
      release_year: 1994,
      imdb_score: 8.5,
      movie_certification: "G",
      genre: "Animation|Adventure|Drama",
      producer_name: "Don Hahn",
      award_name: "Academy Award for Best Original Score",
      director_name: "Roger Allers, Rob Minkoff",
      actors: "Matthew Broderick|Jeremy Irons|James Earl Jones",
      reviewer_name: "Roger Ebert",
      songs: "Circle of Life|Hakuna Matata|Can You Feel the Love Tonight",
      poster_url: "https://via.placeholder.com/300x450/FF8C00/FFFFFF?text=The+Lion+King+(1994)",
    },
    {
      movie_id: "20",
      movie_name: "Saving Private Ryan",
      movie_duration: 169,
      plot_keyword: "world war ii|rescue mission|d-day|brotherhood|sacrifice",
      language: "English",
      country: "USA",
      budget: 70000000,
      release_year: 1998,
      imdb_score: 8.6,
      movie_certification: "R",
      genre: "Drama|War",
      producer_name: "Steven Spielberg",
      award_name: "Academy Award for Best Director",
      director_name: "Steven Spielberg",
      actors: "Tom Hanks|Matt Damon|Tom Sizemore",
      reviewer_name: "Roger Ebert",
      songs: "Hymn to the Fallen",
      poster_url: "https://via.placeholder.com/300x450/556B2F/FFFFFF?text=Saving+Private+Ryan+(1998)",
    },
    {
      movie_id: "21",
      movie_name: "Spirited Away",
      movie_duration: 125,
      plot_keyword: "spirits|bathhouse|identity|courage|transformation",
      language: "Japanese",
      country: "Japan",
      budget: 19000000,
      release_year: 2001,
      imdb_score: 8.6,
      movie_certification: "PG",
      genre: "Animation|Adventure|Family",
      producer_name: "Toshio Suzuki",
      award_name: "Academy Award for Best Animated Feature",
      director_name: "Hayao Miyazaki",
      actors: "Rumi Hiiragi|Miyu Irino|Mari Natsuki",
      reviewer_name: "Roger Ebert",
      songs: "Always With Me",
      poster_url: "https://via.placeholder.com/300x450/9ACD32/FFFFFF?text=Spirited+Away+(2001)",
    },
    {
      movie_id: "22",
      movie_name: "Eternal Sunshine of the Spotless Mind",
      movie_duration: 108,
      plot_keyword: "memory|love|loss|identity|relationship",
      language: "English",
      country: "USA",
      budget: 20000000,
      release_year: 2004,
      imdb_score: 8.3,
      movie_certification: "R",
      genre: "Drama|Romance|Sci-Fi",
      producer_name: "Anthony Bregman",
      award_name: "Academy Award for Best Original Screenplay",
      director_name: "Michel Gondry",
      actors: "Jim Carrey|Kate Winslet|Kirsten Dunst",
      reviewer_name: "Roger Ebert",
      songs: "Everybody's Gotta Learn Sometimes",
      poster_url: "https://via.placeholder.com/300x450/DB7093/FFFFFF?text=Eternal+Sunshine+(2004)",
    },
    {
      movie_id: "23",
      movie_name: "The Green Mile",
      movie_duration: 189,
      plot_keyword: "prison|supernatural|death row|healing|injustice",
      language: "English",
      country: "USA",
      budget: 60000000,
      release_year: 1999,
      imdb_score: 8.6,
      movie_certification: "R",
      genre: "Crime|Drama|Fantasy",
      producer_name: "David Valdes",
      award_name: "Academy Award Nominations for Best Picture",
      director_name: "Frank Darabont",
      actors: "Tom Hanks|Michael Clarke Duncan|David Morse",
      reviewer_name: "Roger Ebert",
      songs: "None",
      poster_url: "https://via.placeholder.com/300x450/9932CC/FFFFFF?text=The+Green+Mile+(1999)",
    },
    {
      movie_id: "24",
      movie_name: "Inglourious Basterds",
      movie_duration: 153,
      plot_keyword: "world war ii|revenge|nazi|assassination|alternate history",
      language: "English",
      country: "USA",
      budget: 70000000,
      release_year: 2009,
      imdb_score: 8.3,
      movie_certification: "R",
      genre: "Adventure|Drama|War",
      producer_name: "Lawrence Bender",
      award_name: "Academy Award for Best Supporting Actor",
      director_name: "Quentin Tarantino",
      actors: "Brad Pitt|Christoph Waltz|Michael Fassbender",
      reviewer_name: "Roger Ebert",
      songs: "Cat People|Putting Out Fire",
      poster_url: "https://via.placeholder.com/300x450/556B2F/FFFFFF?text=Inglourious+Basterds+(2009)",
    },
    {
      movie_id: "25",
      movie_name: "The Pianist",
      movie_duration: 150,
      plot_keyword: "holocaust|survival|world war ii|music|pianist",
      language: "English",
      country: "France",
      budget: 35000000,
      release_year: 2002,
      imdb_score: 8.5,
      movie_certification: "R",
      genre: "Biography|Drama|Music",
      producer_name: "Roman Polanski",
      award_name: "Academy Award for Best Actor",
      director_name: "Roman Polanski",
      actors: "Adrien Brody|Thomas Kretschmann|Frank Finlay",
      reviewer_name: "Roger Ebert",
      songs: "Nocturne in C Sharp Minor",
      poster_url: "https://via.placeholder.com/300x450/4B0082/FFFFFF?text=The+Pianist+(2002)",
    },
    {
      movie_id: "26",
      movie_name: "Joker",
      movie_duration: 122,
      plot_keyword: "mental illness|transformation|society|violence|identity",
      language: "English",
      country: "USA",
      budget: 55000000,
      release_year: 2019,
      imdb_score: 8.4,
      movie_certification: "R",
      genre: "Crime|Drama|Thriller",
      producer_name: "Todd Phillips",
      award_name: "Academy Award for Best Actor",
      director_name: "Todd Phillips",
      actors: "Joaquin Phoenix|Robert De Niro|Zazie Beetz",
      reviewer_name: "A.O. Scott",
      songs: "That's Life|Send in the Clowns",
      poster_url: "https://via.placeholder.com/300x450/800000/FFFFFF?text=Joker+(2019)",
    },
    {
      movie_id: "27",
      movie_name: "Avengers: Endgame",
      movie_duration: 181,
      plot_keyword: "superhero|time travel|sacrifice|teamwork|final battle",
      language: "English",
      country: "USA",
      budget: 356000000,
      release_year: 2019,
      imdb_score: 8.4,
      movie_certification: "PG-13",
      genre: "Action|Adventure|Drama",
      producer_name: "Kevin Feige",
      award_name: "None",
      director_name: "Anthony Russo, Joe Russo",
      actors: "Robert Downey Jr.|Chris Evans|Mark Ruffalo",
      reviewer_name: "A.O. Scott",
      songs: "None",
      poster_url: "https://via.placeholder.com/300x450/8B0000/FFFFFF?text=Avengers:+Endgame+(2019)",
    },
    {
      movie_id: "28",
      movie_name: "The Truman Show",
      movie_duration: 103,
      plot_keyword: "reality tv|deception|freedom|identity|escape",
      language: "English",
      country: "USA",
      budget: 60000000,
      release_year: 1998,
      imdb_score: 8.1,
      movie_certification: "PG",
      genre: "Comedy|Drama|Sci-Fi",
      producer_name: "Scott Rudin",
      award_name: "None",
      director_name: "Peter Weir",
      actors: "Jim Carrey|Laura Linney|Noah Emmerich",
      reviewer_name: "Roger Ebert",
      songs: "Father Kolbe's Preaching",
      poster_url: "https://via.placeholder.com/300x450/00008B/FFFFFF?text=The+Truman+Show+(1998)",
    },
    {
      movie_id: "29",
      movie_name: "Coco",
      movie_duration: 105,
      plot_keyword: "family|music|death|memory|culture",
      language: "English",
      country: "USA",
      budget: 175000000,
      release_year: 2017,
      imdb_score: 8.4,
      movie_certification: "PG",
      genre: "Animation|Adventure|Family",
      producer_name: "Darla K. Anderson",
      award_name: "Academy Award for Best Animated Feature",
      director_name: "Lee Unkrich",
      actors: "Anthony Gonzalez|Gael García Bernal|Benjamin Bratt",
      reviewer_name: "A.O. Scott",
      songs: "Remember Me|Un Poco Loco",
      poster_url: "https://via.placeholder.com/300x450/9ACD32/FFFFFF?text=Coco+(2017)",
    },
    {
      movie_id: "30",
      movie_name: "A Beautiful Mind",
      movie_duration: 135,
      plot_keyword: "mathematics|schizophrenia|genius|nobel prize|love",
      language: "English",
      country: "USA",
      budget: 58000000,
      release_year: 2001,
      imdb_score: 8.2,
      movie_certification: "PG-13",
      genre: "Biography|Drama",
      producer_name: "Brian Grazer",
      award_name: "Academy Award for Best Picture",
      director_name: "Ron Howard",
      actors: "Russell Crowe|Ed Harris|Jennifer Connelly",
      reviewer_name: "Roger Ebert",
      songs: "All Love Can Be",
      poster_url: "https://via.placeholder.com/300x450/483D8B/FFFFFF?text=A+Beautiful+Mind+(2001)",
    },
  ]

  // Add all movies to the database
  for (const movie of movies) {
    await db.add("movies", movie)
  }
}

// User functions
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDB()
  return db.getFromIndex("users", "by-email", email)
}

export async function createUser(id: string, email: string, username: string, password: string): Promise<User> {
  const db = await getDB()
  const now = new Date().toISOString()

  const newUser: User = {
    id,
    email,
    username,
    password,
    created_at: now,
    last_login: now,
  }

  await db.add("users", newUser)
  return newUser
}

export async function updateLastLogin(userId: string): Promise<void> {
  const db = await getDB()
  const user = await db.get("users", userId)

  if (user) {
    user.last_login = new Date().toISOString()
    await db.put("users", user)
  }
}

// Favorites functions
export async function getFavorites(userId: string): Promise<string[]> {
  const db = await getDB()
  const favorites = await db.getAllFromIndex("favorites", "by-user", userId)
  return favorites.map((fav) => fav.movie_id)
}

export async function addFavorite(userId: string, movieId: string): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()

  await db.put("favorites", {
    user_id: userId,
    movie_id: movieId,
    added_at: now,
  })
}

export async function removeFavorite(userId: string, movieId: string): Promise<void> {
  const db = await getDB()
  await db.delete("favorites", [userId, movieId])
}

// Reviews functions
export async function getReviewsByUser(userId: string): Promise<Review[]> {
  const db = await getDB()
  return db.getAllFromIndex("reviews", "by-user", userId)
}

export async function getReviewsByMovie(movieId: string): Promise<Review[]> {
  const db = await getDB()
  const reviews = await db.getAllFromIndex("reviews", "by-movie", movieId)

  // Add username to each review
  const reviewsWithUsernames = await Promise.all(
    reviews.map(async (review) => {
      const user = await db.get("users", review.user_id)
      return {
        ...review,
        username: user ? user.username : "Unknown User",
      }
    }),
  )

  return reviewsWithUsernames
}

export async function addReview(
  id: string,
  userId: string,
  movieId: string,
  rating: number,
  content: string,
): Promise<Review> {
  const db = await getDB()
  const now = new Date().toISOString()

  const newReview: Review = {
    id,
    user_id: userId,
    movie_id: movieId,
    rating,
    content,
    created_at: now,
  }

  await db.add("reviews", newReview)
  return newReview
}

export async function updateReview(id: string, rating: number, content: string): Promise<void> {
  const db = await getDB()
  const review = await db.get("reviews", id)

  if (review) {
    review.rating = rating
    review.content = content
    await db.put("reviews", review)
  }
}

export async function deleteReview(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("reviews", id)
}

// Analytics functions
export async function getRatingDistribution(): Promise<{ rating: string; count: number }[]> {
  const movies = await executeQuery("SELECT * FROM movies")
  const ratingCounts: Record<string, number> = {}

  movies.forEach((movie: Movie) => {
    // Round to nearest 0.5
    const roundedRating = (Math.round(movie.imdb_score * 2) / 2).toFixed(1)
    ratingCounts[roundedRating] = (ratingCounts[roundedRating] || 0) + 1
  })

  return Object.entries(ratingCounts)
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => Number.parseFloat(a.rating) - Number.parseFloat(b.rating))
}

export async function getGenreDistribution(): Promise<{ genre: string; count: number }[]> {
  return executeQuery("SELECT COUNT(*) FROM movies GROUP BY genre")
}

export async function getYearDistribution(): Promise<{ year: string; count: number; avgRating: number }[]> {
  return executeQuery("SELECT COUNT(*) FROM movies GROUP BY release_year")
}

export async function getBudgetRevenueAnalysis(): Promise<any[]> {
  const movies = await executeQuery("SELECT * FROM movies")

  return movies
    .map((movie: Movie) => ({
      title: movie.movie_name,
      budget: movie.budget,
      // For this example, we'll estimate revenue as 2-4x budget based on score
      revenue: movie.budget * (2 + (movie.imdb_score / 10) * 2),
      profit: movie.budget * (2 + (movie.imdb_score / 10) * 2) - movie.budget,
      roi: ((movie.budget * (2 + (movie.imdb_score / 10) * 2) - movie.budget) / movie.budget) * 100,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 20)
}

export async function getDirectorAnalysis(): Promise<any[]> {
  const movies = await executeQuery("SELECT * FROM movies")
  const directorData: Record<string, { movieCount: number; totalRating: number; totalRevenue: number }> = {}

  movies.forEach((movie: Movie) => {
    if (!directorData[movie.director_name]) {
      directorData[movie.director_name] = {
        movieCount: 0,
        totalRating: 0,
        totalRevenue: 0,
      }
    }

    directorData[movie.director_name].movieCount += 1
    directorData[movie.director_name].totalRating += movie.imdb_score
    // Estimate revenue as 2-4x budget based on score
    directorData[movie.director_name].totalRevenue += movie.budget * (2 + (movie.imdb_score / 10) * 2)
  })

  return Object.entries(directorData)
    .map(([director, data]) => ({
      director,
      movieCount: data.movieCount,
      avgRating: Number((data.totalRating / data.movieCount).toFixed(2)),
      totalRevenue: data.totalRevenue,
    }))
    .filter((d) => d.movieCount >= 2)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 15)
}

// Export all functions
export const dbClient = {
  executeQuery,
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
  getRatingDistribution,
  getGenreDistribution,
  getYearDistribution,
  getBudgetRevenueAnalysis,
  getDirectorAnalysis,
}
