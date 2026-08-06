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
        resolvedTheme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"
      }
      onClick={toggleTheme}
    >
      {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
