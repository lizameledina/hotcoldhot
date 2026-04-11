declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
        }
        ready: () => void
        expand: () => void
        close: () => void
        BackButton: {
          show: () => void
          hide: () => void
          onClick: (fn: () => void) => void
          offClick: (fn: () => void) => void
          isVisible: boolean
        }
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          selectionChanged: () => void
        }
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
        }
        colorScheme: 'light' | 'dark'
        isExpanded: boolean
        viewportHeight: number
        MainButton: {
          setText: (text: string) => void
          show: () => void
          hide: () => void
          onClick: (fn: () => void) => void
        }
      }
    }
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp

  const initData = tg?.initData ?? ''

  return {
    tg,
    initData,
    user: tg?.initDataUnsafe?.user,
    // SDK загружается даже в браузере, но initData будет пустым — значит мы не в Telegram
    isInTelegram: !!tg && initData.length > 0,
    haptic: tg?.HapticFeedback,
  }
}
