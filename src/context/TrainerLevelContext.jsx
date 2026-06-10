import { createContext, useContext, useState } from 'react'

const Ctx = createContext([40, () => {}])

export function TrainerLevelProvider({ children }) {
  const [level, setLevel] = useState(() =>
    Math.min(50, Math.max(1, parseInt(localStorage.getItem('trainerLevel') || '40', 10)))
  )

  function update(v) {
    const clamped = Math.min(50, Math.max(1, Number(v) || 40))
    setLevel(clamped)
    localStorage.setItem('trainerLevel', String(clamped))
  }

  return <Ctx.Provider value={[level, update]}>{children}</Ctx.Provider>
}

export const useTrainerLevel = () => useContext(Ctx)
