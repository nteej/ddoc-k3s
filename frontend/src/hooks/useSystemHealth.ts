import { useQuery } from '@tanstack/react-query';

export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'loading';

export interface ServiceHealth {
  status: ServiceStatus;
  latency_ms: number | null;
  error?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded';
  timestamp: string;
  services: Record<string, ServiceHealth>;
}

const HEALTH_URL = 'http://localhost:8081/api/health/system';

async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(HEALTH_URL, { credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useSystemHealth(refetchIntervalMs = 10_000) {
  return useQuery<SystemHealth, Error>({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: true,
    staleTime: refetchIntervalMs,
    retry: 1,
  });
}
