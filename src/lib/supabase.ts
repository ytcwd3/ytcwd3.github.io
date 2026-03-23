import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mjrqvffiinflzdwnzvte.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Game {
  id: number
  name: string
  category: string[]
  subcategory: string[]
  code: string
  unzipcode: string
  quarkpan: string
  baidupan: string
  thunderpan: string
  updatedate: string
}

export interface Guestbook {
  id: number
  name: string
  email?: string
  message: string
  created_at: string
  parent_id?: number
  admin_id?: string
  is_reply?: boolean
}
