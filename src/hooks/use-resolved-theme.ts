import * as React from "react"

export type ResolvedTheme = "dark" | "light"

function readResolvedTheme(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function useResolvedTheme(): ResolvedTheme {
  const [theme, setTheme] = React.useState<ResolvedTheme>(readResolvedTheme)

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(readResolvedTheme())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return theme
}
