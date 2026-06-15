import { GrossisteSidebar } from "@/components/grossistes/sidebar"
import { GrossisteTopbar } from "@/components/grossistes/topbar"

export default function GrossistesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <GrossisteSidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <GrossisteTopbar grossisteName="UbiPharm Sénégal" notificationCount={3} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
