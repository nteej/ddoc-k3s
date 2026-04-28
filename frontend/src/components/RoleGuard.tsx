import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types';

const HIERARCHY: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

interface Props {
  minRole: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGuard({ minRole, children, fallback = null }: Props) {
  const { user } = useAuth();
  const role = user?.role ?? 'viewer';
  return (HIERARCHY[role] ?? 0) >= HIERARCHY[minRole] ? <>{children}</> : <>{fallback}</>;
}
