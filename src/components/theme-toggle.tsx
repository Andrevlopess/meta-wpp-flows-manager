import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"

export function ThemeToggle() {
  const { toggleTheme } = useTheme()
  const resolvedTheme = useResolvedTheme()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={
        resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      onClick={toggleTheme}
    >
      {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
