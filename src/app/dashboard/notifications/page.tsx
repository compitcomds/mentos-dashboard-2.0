
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MailWarning, AlertTriangle, Info, CheckCircle, XCircle, Loader2, ExternalLink, CheckCheck, ChevronLeft, ChevronRight, BellRing } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetNotifications, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } from '@/lib/queries/notification';
import type { Notification, NotificationType } from '@/types/notification';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const getNotificationIcon = (type?: NotificationType | null): React.ReactElement => {
  switch (type) {
    case 'info':
      return <Info className="h-5 w-5 text-blue-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'custom':
      return <BellRing className="h-5 w-5 text-purple-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

const NOTIFICATIONS_PER_PAGE = 10;

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = React.useState(1);

  const {
    data: notificationsResponse,
    isLoading,
    isError,
    error,
    isFetching,
    refetch
  } = useGetNotifications({
    limit: NOTIFICATIONS_PER_PAGE,
    page: currentPage,
    isRead: null, // Fetch all notifications (read and unread)
    enabled: true,
    refetchInterval: false,
  });

  const notifications = notificationsResponse?.data || [];
  const pagination = notificationsResponse?.meta?.pagination;

  const markAsReadMutation = useMarkNotificationAsReadMutation();
  const markAllAsReadMutation = useMarkAllNotificationsAsReadMutation();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification) return;
    if (notification.documentId && notification.isRead === false) {
      markAsReadMutation.mutate(
        { documentId: notification.documentId }, // Use documentId
        {
          onSuccess: () => {
            // Query invalidation handles refetch
          },
        }
      );
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate(undefined, {
        onSuccess: () => {
            // Toast handled by mutation hook
        },
    });
  };

  const hasUnread = notifications.some(n => n && n.isRead === false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">All Notifications</CardTitle>
            <CardDescription>View and manage all your notifications.</CardDescription>
          </div>
          <Button
            onClick={handleMarkAllRead}
            disabled={markAllAsReadMutation.isPending || isLoading || !hasUnread}
            size="sm"
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Mark All as Read
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && !notificationsResponse && (
            <div className="space-y-4">
              {[...Array(NOTIFICATIONS_PER_PAGE)].map((_, i) => (
                <div key={i} className="flex items-start space-x-3 p-3 border rounded-md">
                  <Skeleton className="h-6 w-6 rounded-full mt-1" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-2 w-2 rounded-full self-center" />
                </div>
              ))}
            </div>
          )}

          {isError && !isFetching && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitleComponent>Error Loading Notifications</AlertTitleComponent>
              <AlertDescription>
                {(error as Error)?.message || 'Could not fetch notifications.'}
                 <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                     {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                     Retry
                  </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MailWarning className="h-16 w-16 mb-4" />
              <h3 className="text-xl font-semibold">No Notifications Yet</h3>
              <p>You're all caught up!</p>
            </div>
          )}

          {!isLoading && !isError && notifications.length > 0 && (
            <ScrollArea className="max-h-[calc(100vh-20rem)]">
              <div className="space-y-3 pr-3">
                {notifications.map((notification) => {
                  if (!notification) return null;
                  const isUnread = notification.isRead === false;
                  return (
                    <div
                      key={notification.documentId || notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "flex items-start space-x-3 p-3.5 border rounded-lg transition-colors hover:bg-accent",
                        isUnread && "bg-primary/5 hover:bg-primary/10 border-primary/30",
                        notification.actionUrl && "cursor-pointer"
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                           <h4 className={cn("text-sm font-semibold text-foreground truncate", isUnread && "text-primary")}>
                             {notification.title}
                           </h4>
                            {notification.createdAt && (
                                <p className="text-xs text-muted-foreground/80 ml-2 flex-shrink-0">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                            )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                        )}
                        {notification.actionUrl && (
                           <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-xs" asChild>
                             <Link href={notification.actionUrl} onClick={(e) => e.stopPropagation()}>
                               View Details <ExternalLink className="ml-1 h-3 w-3" />
                             </Link>
                           </Button>
                        )}
                      </div>
                      {isUnread && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 self-center" title="Unread" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between pt-6 mt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading || isFetching}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pageCount} (Total: {pagination.total} notifications)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination.pageCount, prev + 1))}
                disabled={currentPage === pagination.pageCount || isLoading || isFetching}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
