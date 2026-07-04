import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      notificationCount: 0,
      loading: false,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setNotificationCount: (count) => set({ notificationCount: count }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: 'cleanconnect-app', partialize: (state) => ({ theme: state.theme }) }
  )
)
