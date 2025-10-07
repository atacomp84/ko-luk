import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { showError } from '@/utils/toast'

interface Profile {
  id: string
  role: 'student' | 'coach' | 'admin'
  first_name: string
  last_name: string
  username: string
  email: string
  created_at: string
  updated_at: string
}

interface SessionContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Session'ı tamamen temizleme fonksiyonu
  const clearSession = useCallback(() => {
    console.log('[SessionContext] Clearing session completely')
    setSession(null)
    setUser(null)
    setProfile(null)
    
    // Supabase session'ını temizle
    supabase.auth.signOut()
    
    // LocalStorage'ı temizle
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key)
      }
    })
  }, [])

  // Profile yükleme fonksiyonu
  const loadProfile = useCallback(async (userId: string) => {
    try {
      console.log('[SessionContext] Loading profile for user:', userId)
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('[SessionContext] Profile load error:', profileError)
        throw profileError
      }

      if (!profile) {
        console.error('[SessionContext] No profile found for user')
        throw new Error('Profile not found')
      }

      console.log('[SessionContext] Profile loaded successfully:', profile)
      setProfile(profile as Profile)
      return profile as Profile
      
    } catch (error) {
      console.error('[SessionContext] Failed to load profile:', error)
      throw error
    }
  }, [])

  // Session durumunu kontrol etme
  const checkSession = useCallback(async () => {
    try {
      console.log('[SessionContext] Checking session state')
      
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[SessionContext] Session check error:', sessionError)
        throw sessionError
      }

      if (!currentSession) {
        console.log('[SessionContext] No active session found')
        clearSession()
        return
      }

      console.log('[SessionContext] Active session found:', currentSession.user?.id)
      
      // Profile yükle
      await loadProfile(currentSession.user.id)
      
      setSession(currentSession)
      setUser(currentSession.user)
      
    } catch (error) {
      console.error('[SessionContext] Session check failed:', error)
      clearSession()
    }
  }, [clearSession, loadProfile])

  // Çıkış yapma fonksiyonu
  const signOut = useCallback(async () => {
    try {
      console.log('[SessionContext] Signing out')
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[SessionContext] Sign out error:', error)
        throw error
      }
      
      clearSession()
      navigate('/auth', { replace: true })
      
    } catch (error) {
      console.error('[SessionContext] Sign out failed:', error)
      showError('Çıkış yapılırken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [clearSession, navigate])

  // Profile yenileme
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id)
    }
  }, [user, loadProfile])

  // Auth state değişikliklerini dinle
  useEffect(() => {
    console.log('[SessionContext] Setting up auth state listener')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[SessionContext] Auth event:', event)
        
        if (event === 'SIGNED_OUT') {
          console.log('[SessionContext] User signed out')
          clearSession()
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentSession?.user) {
            try {
              await loadProfile(currentSession.user.id)
              setSession(currentSession)
              setUser(currentSession.user)
            } catch (error) {
              console.error('[SessionContext] Failed to load profile after sign in:', error)
              clearSession()
            }
          }
        }
      }
    )

    // İlk session kontrolü
    checkSession()

    return () => {
      console.log('[SessionContext] Cleaning up auth listener')
      subscription.unsubscribe()
    }
  }, [checkSession, clearSession, loadProfile])

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}