"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { dbClient } from "@/lib/db-service"
import { v4 as uuidv4 } from "uuid"

// Simple hash function for passwords (in a real app, use bcrypt)
function hashPassword(password: string): string {
  // This is a simple hash for demo purposes only
  // In a real app, use a proper password hashing library
  return btoa(password + "salt")
}

export type UserProfile = {
  id: string
  email: string
  username: string
  created_at: string
  last_login: string
}

type AuthContextType = {
  user: UserProfile | null
  isLoading: boolean
  signUp: (email: string, password: string, username: string) => Promise<{ error: any | null }>
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check for stored session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === "undefined") {
        setIsLoading(false)
        return
      }

      const storedUser = localStorage.getItem("movieInsightsUser")
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
        } catch (error) {
          console.error("Failed to parse stored user data:", error)
          localStorage.removeItem("movieInsightsUser")
        }
      }
      setIsLoading(false)
    }

    checkSession()
  }, [])

  async function refreshProfile() {
    if (user) {
      await dbClient.updateLastLogin(user.id)
    }
  }

  async function signUp(email: string, password: string, username: string) {
    try {
      setIsLoading(true)

      // Check if user already exists
      const existingUser = await dbClient.getUserByEmail(email)
      if (existingUser) {
        return { error: { message: "User with this email already exists" } }
      }

      // Create new user
      const userId = uuidv4()
      const hashedPassword = hashPassword(password)

      const newUser = await dbClient.createUser(userId, email, username, hashedPassword)

      // Remove password from user object before storing
      const { password: _, ...userWithoutPassword } = newUser

      // Store user in state and localStorage
      setUser(userWithoutPassword)
      localStorage.setItem("movieInsightsUser", JSON.stringify(userWithoutPassword))

      return { error: null }
    } catch (error) {
      console.error("Error signing up:", error)
      return { error }
    } finally {
      setIsLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      setIsLoading(true)

      // Get user by email
      const user = await dbClient.getUserByEmail(email)

      if (!user) {
        return { error: { message: "No account found with this email. Please register." } }
      }

      // Check password
      const hashedPassword = hashPassword(password)
      if (user.password !== hashedPassword) {
        return { error: { message: "Invalid password" } }
      }

      // Update last login
      await dbClient.updateLastLogin(user.id)

      // Remove password from user object before storing
      const { password: _, ...userWithoutPassword } = user

      // Store user in state and localStorage
      setUser(userWithoutPassword)
      localStorage.setItem("movieInsightsUser", JSON.stringify(userWithoutPassword))

      return { error: null }
    } catch (error) {
      console.error("Error signing in:", error)
      return { error }
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    setUser(null)
    localStorage.removeItem("movieInsightsUser")
    router.push("/")
  }

  const value = {
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
