import { useState, useEffect } from 'react'
import { bffFetch } from '../services/BFFClient'

interface DashboardStats {
  totalCopies: number
  totalVideos: number
  postsPublished: number
  connectedAccounts: number
  whatsappContacts: number
}

interface AIInsights {
  top_formats: string[]
  best_times: string[]
  avg_engagement: number
  suggestion: string
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bffFetch('/dashboard/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}

export function useAIInsights() {
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bffFetch('/ai/insights')
      .then(r => r.json())
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setLoading(false))
  }, [])

  return { insights, loading }
}

export function useAIJobs() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bffFetch('/ai/jobs')
      .then(r => r.json())
      .then(data => setJobs(Array.isArray(data) ? data : data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [])

  return { jobs, loading }
}

export function usePendingApprovals() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    bffFetch('/automation/pending-approvals')
      .then(r => r.json())
      .then(data => setPosts(Array.isArray(data) ? data : data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  return { posts, loading, refresh }
}
