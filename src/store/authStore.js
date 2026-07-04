import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      session: null,
      role: null,
      homeowner: null,
      worker: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setRole: (role) => set({ role }),
      setHomeowner: (homeowner) => set({ homeowner }),
      setWorker: (worker) => set({ worker }),
      clearAuth: () => set({ user: null, session: null, role: null, homeowner: null, worker: null }),
    }),
    { name: 'cleanconnect-auth', partialize: (state) => ({ user: state.user, role: state.role }) }
  )
)
