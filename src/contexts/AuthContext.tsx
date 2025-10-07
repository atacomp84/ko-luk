import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useSession, SessionProvider as SessionProviderComponent } from './SessionContext'
import { useNavigate } from 'react-router-dom'

interface AuthContextType {
  session: any
  user: any
  profile: any
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProviderComponent>
      <AuthContextInner>{children}</AuthContextInner>
    </SessionProviderComponent>
  )
}

function AuthContextInner({ children }: { children: ReactNode }) {
  const session = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-redirect based on role
    if (!session.loading && session.profile) {
      if (session.profile.role === 'coach') {
        navigate('/coach/dashboard', { replace: true })
      } else if (session.profile.role === 'student') {
        navigate('/student/dashboard', { replace: true })
      } else if (session.profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      }
    }
  }, [session.loading, session.profile, navigate])

  return (
    <AuthContext.Provider value={session}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}