import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useSession, SessionProvider as SessionProviderComponent } from './SessionContext'
// import { useNavigate } from 'react-router-dom' // useNavigate importu kaldırıldı

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
  // const navigate = useNavigate() // useNavigate kullanımı kaldırıldı

  // Bu useEffect artık sadece loglama yapıyor, gerçek yönlendirme ProtectedRoute veya ilgili dashboard sayfaları tarafından ele alınacak.
  useEffect(() => {
    console.log(`[AuthContextInner] Session loading: ${session.loading}, Profile: ${session.profile ? 'Object' : 'null'}`);
    // Otomatik yönlendirme mantığı buradan kaldırıldı.
  }, [session.loading, session.profile])

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