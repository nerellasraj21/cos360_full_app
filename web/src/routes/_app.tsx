import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Navbar } from "../components/ui/navbar"
import { Sidebar } from "../components/ui/sidebar"
import { AppBreadcrumb } from "../components/ui/breadcrumb"
import { useState, useEffect } from "react"
import { useAuthStore } from "@/lib/authStore"
import { useMenuData } from "@/lib/menuUtils"

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) {
      throw redirect({ to: '/login', replace: true })
    }
  },
  component: () => {
    const [sidebarOpen, setSidebarOpen] = useState(false) // Start closed on mobile
    const [isMobile, setIsMobile] = useState(false)
    const { data: menuData, isLoading, error } = useMenuData()

    // Handle responsive behavior
    useEffect(() => {
      const checkMobile = () => {
        const mobile = window.innerWidth < 1022 // md breakpoint
        setIsMobile(mobile)
        
        // Auto-close sidebar on mobile, auto-open on desktop
        if (mobile) {
          setSidebarOpen(false)
        } else {
          setSidebarOpen(true)
        }
      }

      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Handle sidebar toggle with mobile considerations
    const handleSidebarToggle = () => {
      setSidebarOpen(prev => !prev)
    }

    return (
      <div className="min-h-screen bg-background">
        {/* Overlay for mobile when sidebar is open */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden "
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <Sidebar 
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          menuData={menuData}
          isMobile={isMobile}
        />
        
        <div className={`
          min-h-screen transition-all duration-300 ease-in-out
          ${isMobile 
            ? 'ml-0' // No margin on mobile - sidebar overlays
            : sidebarOpen 
              ? 'ml-16 lg:ml-64' // Responsive sidebar width
              : 'ml-16' // Collapsed sidebar width
          }
        `}>
          <Navbar
            sidebarOpen={sidebarOpen}
            onSidebarToggle={handleSidebarToggle}
            isMobile={isMobile}
          />

          <AppBreadcrumb />

          <main className="p-4 md:p-6 lg:p-8">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            
            {error && (
              <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">Error loading menu data</h3>
                <p className="text-sm">{error.message}</p>
              </div>
            )}
            
            <Outlet />
          </main>
        </div>
      </div>
    )
  },
})