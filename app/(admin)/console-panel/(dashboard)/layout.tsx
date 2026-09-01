'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/admin/layout/sidebar';
import { AdminHeader } from '@/components/admin/layout/header';
import { AdminRoleProvider } from '@/components/admin/context/AdminRoleContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AdminRoleProvider>
      <div className="h-screen bg-background overflow-hidden">
        <AdminHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="fixed top-16 bottom-0 left-0 right-0 lg:left-64 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </AdminRoleProvider>
  );
}
