import { createContext, useContext, useEffect, useState } from 'react'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'

const Ctx = createContext([40, () => {}])

export function TrainerLevelProvider({ children }) {
  // Seed from localStorage instantly so the value is available before the network responds
  const [level, setLevel] = useState(() =>
    Math.min(50, Math.max(1, parseInt(localStorage.getItem('trainerLevel') || '40', 10)))
  )

  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()

  // Once the server profile loads, sync it into state
  useEffect(() => {
    if (profile?.trainerLevel != null) {
      setLevel(profile.trainerLevel)
      localStorage.setItem('trainerLevel', String(profile.trainerLevel))
    }
  }, [profile?.trainerLevel])

  function update(v) {
    const clamped = Math.min(50, Math.max(1, Number(v) || 40))
    setLevel(clamped)
    localStorage.setItem('trainerLevel', String(clamped))
    updateProfile.mutate({ trainerLevel: clamped })
  }

  return <Ctx.Provider value={[level, update]}>{children}</Ctx.Provider>
}

export const useTrainerLevel = () => useContext(Ctx)
