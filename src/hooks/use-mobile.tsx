import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') return
    const win = (globalThis as any).window as Window
    const mql = (win as any).matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile((win as any).innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
  setIsMobile((win as any).innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

    