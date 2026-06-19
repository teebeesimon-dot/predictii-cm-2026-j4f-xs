'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  COMPETITIONS,
  DEFAULT_EDITION_ID,
  getCompetition,
  getEdition,
  type Competition,
  type Edition,
} from '@/lib/editions'

const STORAGE_KEY = 'j4f_edition'

interface EditionContextValue {
  editionId: string
  edition: Edition
  competition: Competition
  setEditionId: (id: string) => void
}

const EditionContext = createContext<EditionContextValue | null>(null)

export function EditionProvider({ children }: { children: ReactNode }) {
  const [editionId, setEditionIdState] = useState<string>(DEFAULT_EDITION_ID)

  // Încarcă ediția salvată (o singură dată, pe client).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && getEdition(saved)) setEditionIdState(saved)
    } catch {
      // ignore
    }
  }, [])

  // Aplică tema competiției pe <html> prin data-competition.
  useEffect(() => {
    const competition = getCompetition(editionId)
    if (competition) {
      document.documentElement.setAttribute(
        'data-competition',
        competition.theme,
      )
    }
  }, [editionId])

  const setEditionId = (id: string) => {
    if (!getEdition(id)) return
    setEditionIdState(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // ignore
    }
  }

  const edition = getEdition(editionId) ?? getEdition(DEFAULT_EDITION_ID)!
  const competition =
    getCompetition(editionId) ?? COMPETITIONS[edition.competitionId]

  return (
    <EditionContext.Provider
      value={{ editionId: edition.id, edition, competition, setEditionId }}
    >
      {children}
    </EditionContext.Provider>
  )
}

export function useEdition(): EditionContextValue {
  const ctx = useContext(EditionContext)
  if (!ctx) {
    throw new Error('useEdition must be used within an EditionProvider')
  }
  return ctx
}
