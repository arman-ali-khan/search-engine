import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  role: 'admin' | 'webmaster' | 'user'
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return profile ? {
    id: user.id,
    email: user.email!,
    role: profile.role
  } : null
}

export async function updateUserRole(userId: string, role: 'admin' | 'webmaster' | 'user') {
  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)
  
  if (error) throw error
}