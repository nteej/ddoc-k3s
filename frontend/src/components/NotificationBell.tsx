import React, { useState } from 'react';
import { Bell, CheckCheck, FileText, Users, Key, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useUnreadCount,
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from '@/hooks/useNotifications';
import { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';

function typeIcon(type: string) {
  if (type.startsWith('document')) return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
  if (type.startsWith('member')) return <Users className="w-4 h-4 text-green-500 shrink-0" />;
  if (type.startsWith('api_key')) return <Key className="w-4 h-4 text-purple-500 shrink-0" />;
  if (type.startsWith('quota')) return <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />;
  return <Bell className="w-4 h-4 text-gray-400 shrink-0" />;
}

function typeRoute(type: string): string | null {
  if (type.startsWith('document')) return '/files';
  if (type.startsWith('member')) return '/organization';
  if (type.startsWith('api_key')) return '/api-keys';
  return null;
}

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: count = 0 } = useUnreadCount();
  const { data: notifications = [] } = useNotifications(open);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const handleClick = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    const route = typeRoute(n.type);
    if (route) navigate(route);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2 h-auto text-gray-600 hover:text-gray-900">
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-lg p-0 w-80">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Notifications</span>
          {count > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No notifications</div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                  !n.read_at ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="mt-0.5">{typeIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug truncate ${!n.read_at ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.read_at && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                )}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
