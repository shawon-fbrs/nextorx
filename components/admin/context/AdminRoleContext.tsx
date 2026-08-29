'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type AdminRole = 'superadmin' | 'admin' | 'viewer';

interface AdminRoleContextType {
  role: AdminRole;
  setRole: (role: AdminRole) => void;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canAdjustBalance: boolean;
  canAccessSettings: boolean;
  canExport: boolean;
}

const rolePermissions = {
  superadmin: { canEdit: true, canDelete: true, canApprove: true, canAdjustBalance: true, canAccessSettings: true, canExport: true },
  admin: { canEdit: true, canDelete: true, canApprove: true, canAdjustBalance: false, canAccessSettings: true, canExport: true },
  viewer: { canEdit: false, canDelete: false, canApprove: false, canAdjustBalance: false, canAccessSettings: false, canExport: true },
};

const AdminRoleContext = createContext<AdminRoleContextType | null>(null);

export function AdminRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AdminRole>('admin');
  const permissions = rolePermissions[role];

  return (
    <AdminRoleContext.Provider
      value={{
        role,
        setRole,
        ...permissions,
      }}
    >
      {children}
    </AdminRoleContext.Provider>
  );
}

export function useAdminRole() {
  const context = useContext(AdminRoleContext);
  if (!context) {
    throw new Error('useAdminRole must be used within AdminRoleProvider');
  }
  return context;
}
