import { Outlet } from "react-router-dom"

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* <Navbar /> */}
      <main className="flex-1 flex flex-col h-full  container mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-border/40 py-4  text-xs text-muted-foreground">
        <div className="container mx-auto max-w-6xl px-4">
          <p>© {new Date().getFullYear()} Claim. <a target="_blank" className="underline underline-offset-2" href="https://github.com/hayzedd2/claim">Built with Go & React.</a></p>
        </div>
      </footer>
    </div>
  )
}
