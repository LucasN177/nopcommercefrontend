import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, issueGuestToken, onTokenChange, setToken } from './api/client'
import type { TokenModel } from './api/types'

interface Session {
  token: TokenModel | null
  isRegistered: boolean
  /** use a token issued by login, registration, password change, ... */
  signIn(token: TokenModel): void
  /** revokes all tokens of the customer and continues as a new guest */
  signOut(): Promise<void>
}

const SessionContext = createContext<Session | null>(null)

const identity = (token: TokenModel | null) => (token ? `${token.customerGuid}|${token.isRegistered}` : null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState(getToken)

  useEffect(() => {
    let last = identity(getToken())
    return onTokenChange(next => {
      setTokenState(next)
      const current = identity(next)
      // a different customer (login, logout, expired token): all loaded data belongs to the old one
      if (current && current !== last) {
        last = current
        void queryClient.invalidateQueries()
      }
    })
  }, [queryClient])

  const session: Session = {
    token,
    isRegistered: token?.isRegistered ?? false,
    signIn: setToken,
    async signOut() {
      try {
        await api.post('/auth/logout')
      } finally {
        setToken(null)
        await issueGuestToken()
      }
    },
  }

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used within SessionProvider')
  return session
}
