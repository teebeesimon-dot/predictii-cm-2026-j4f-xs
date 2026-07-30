'use client'

import { useEffect, useRef, useState } from 'react'
import EmojiPicker, {
  type EmojiClickData,
  Theme,
  Categories,
  EmojiStyle,
} from 'emoji-picker-react'
import { useTheme } from 'next-themes'
import { Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { rememberEmoji } from '@/lib/groups'

type EmojiPickerFieldProps = {
  value: string
  onChange: (emoji: string) => void
  className?: string
  disabled?: boolean
}

/**
 * Selector emoji tip WhatsApp/Discord: categorii, căutare, recente.
 * Salvează doar caracterul Unicode în formular/Firestore.
 */
export function EmojiPickerField({
  value,
  onChange,
  className,
  disabled,
}: EmojiPickerFieldProps) {
  const { resolvedTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleSelect(data: EmojiClickData) {
    const emoji = data.emoji
    rememberEmoji(emoji)
    onChange(emoji)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="h-10 min-w-14 gap-2 px-3 text-xl"
      >
        {value ? (
          <span aria-hidden className="leading-none">
            {value}
          </span>
        ) : (
          <Smile className="size-5 text-muted-foreground" />
        )}
        <span className="sr-only">
          {value ? `Emoji selectat: ${value}` : 'Alege un emoji'}
        </span>
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Selector emoji"
          className="absolute top-full left-0 z-50 mt-2 max-w-[min(100vw-2rem,350px)] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <EmojiPicker
            onEmojiClick={handleSelect}
            theme={resolvedTheme === 'light' ? Theme.LIGHT : Theme.DARK}
            emojiStyle={EmojiStyle.NATIVE}
            searchPlaceHolder="Caută emoji…"
            previewConfig={{ showPreview: false }}
            height={380}
            width="100%"
            lazyLoadEmojis
            skinTonesDisabled
            categories={[
              { category: Categories.SUGGESTED, name: 'Recente' },
              { category: Categories.SMILEYS_PEOPLE, name: 'Zâmbete' },
              { category: Categories.ANIMALS_NATURE, name: 'Natură' },
              { category: Categories.FOOD_DRINK, name: 'Mâncare' },
              { category: Categories.TRAVEL_PLACES, name: 'Călătorii' },
              { category: Categories.ACTIVITIES, name: 'Activități' },
              { category: Categories.OBJECTS, name: 'Obiecte' },
              { category: Categories.SYMBOLS, name: 'Simboluri' },
              { category: Categories.FLAGS, name: 'Steaguri' },
            ]}
          />
        </div>
      )}
    </div>
  )
}
