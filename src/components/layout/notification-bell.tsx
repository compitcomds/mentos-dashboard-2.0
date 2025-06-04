
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, ExternalLink, MailWarning, CheckCheck, CircleSlash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetNotifications, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } from '@/lib/queries/notification';
import type { Notification, NotificationType } from '@/types/notification'; // Using the updated flat Notification type
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type?: NotificationType | null): React.ReactElement => {
  switch (type) {
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'custom':
      return <Info className="h-4 w-4 text-purple-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

export default function NotificationBell() {
  const router = useRouter();
  // Fetching only unread notifications for the bell dropdown initially
  const { data: notificationsResponse, isLoading, isError } = useGetNotifications({ isRead: false, limit: 5 });
  const markAsReadMutation = useMarkNotificationAsReadMutation();
  const markAllAsReadMutation = useMarkAllNotificationsAsReadMutation();

  const notifications = notificationsResponse?.data || [];
  // Unread count is simply the length of the fetched unread notifications
  const unreadCount = notificationsResponse?.meta?.pagination?.total || 0;


  const handleNotificationClick = (notification: Notification) => {
    if (notification && notification.isRead === false) { // Direct access
      markAsReadMutation.mutate({ notificationId: notification.id });
    }
    if (notification.actionUrl) { // Direct access
      router.push(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Unread Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} New</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[300px] md:max-h-[400px]">
          {isLoading && (
            <div className="p-2 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start space-x-2 p-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && isError && (
            <DropdownMenuItem disabled className="text-red-500">
              <AlertTriangle className="mr-2 h-4 w-4" /> Error loading notifications.
            </DropdownMenuItem>
          )}
          {!isLoading && !isError && notifications.length === 0 && (
             <DropdownMenuItem disabled className="text-center text-muted-foreground py-4">
               <MailWarning className="mr-2 h-4 w-4 mx-auto mb-1" /> No new unread notifications.
            </DropdownMenuItem>
          )}
          {!isLoading && !isError && notifications.length > 0 && (
            notifications.map((notification) => {
              if (!notification) { // Basic check for notification object itself
                return null;
              }
              const isUnread = notification.isRead === false; // Direct access
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start space-x-3 p-3 cursor-pointer hover:bg-accent",
                    isUnread && "bg-primary/5 hover:bg-primary/10" // Should always be true for this list now
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)} {/* Direct access */}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {notification.title} {/* Direct access */}
                    </p>
                    {notification.message && ( /* Direct access */
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/80 mt-0.5">
                      {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 'Recently'} {/* Direct access */}
                    </p>
                  </div>
                  {/* Unread indicator might be redundant if list is only unread, but good for consistency */}
                  {isUnread && (
                     <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" title="Unread"></div>
                  )}
                </DropdownMenuItem>
              )
            })
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {unreadCount > 0 && (
                 <DropdownMenuItem
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className="flex items-center justify-center"
                  >
                    {markAllAsReadMutation.isPending ? (
                        <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Marking all...</>
                    ) : (
                        <> <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read</>
                    )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild className="flex items-center justify-center text-sm text-primary hover:underline">
                 <Link href="/dashboard/notifications">View All Notifications <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
         {!isLoading && !isError && notifications.length === 0 && unreadCount === 0 && (
            <>
             <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="flex items-center justify-center text-sm text-primary hover:underline">
                 <Link href="/dashboard/notifications">View All Notifications <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link>
              </DropdownMenuItem>
            </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
