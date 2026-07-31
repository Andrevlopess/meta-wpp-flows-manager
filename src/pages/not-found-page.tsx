import { Link } from "react-router"

import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-medium">Page not found</p>
      <Button nativeButton={false} render={<Link to="/flows" />}>
        Back to flows
      </Button>
    </div>
  )
}
