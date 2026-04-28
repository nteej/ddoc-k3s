import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Role } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InvitationInfo {
  organization_name: string;
  organization_slug: string;
  email: string;
  role: Role;
}

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getInvitation(token)
      .then(setInfo)
      .catch(e => setError(e.message));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      setAccepting(true);
      await api.acceptInvitation(token);
      navigate('/documents');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invitation Invalid</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading invitation…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You've been invited</CardTitle>
          <CardDescription>
            Join <strong>{info.organization_name}</strong> as a member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Invited email:</span>
            <span className="text-sm font-medium">{info.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <Badge variant="secondary" className="capitalize">{info.role}</Badge>
          </div>
          <Button className="w-full" onClick={handleAccept} disabled={accepting}>
            {accepting ? 'Joining…' : `Join ${info.organization_name}`}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
