
'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation'; // Ensure useSearchParams is imported
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import {
  LayoutDashboard,
  PenSquare,
  Settings,
  Loader2,
  ImageIcon as ImageIconLucide,
  CalendarClock,
  BookText,
  HelpCircle,
  LayoutList,
  FileJson,
  CreditCard,
  Mail, // Added Mail icon for Notifications
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { removeAccessToken, getAccessToken } from '@/lib/actions/auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/layout/header';
import SidebarNav from '@/components/layout/sidebar';
import { useCurrentUser } from '@/lib/queries/user';
import { useGetMetaFormats } from '@/lib/queries/meta-format';
import type { MetaFormat } from '@/types/meta-format';
import type { MenuItem } from '@/components/layout/header';
import { useGetPayments } from '@/lib/queries/payment';
import type { Payment } from '@/types/payment';
import PaymentDueAlert from '@/components/layout/payment-due-alert';
import PaymentOverdueLockScreen from '@/components/layout/payment-overdue-lock-screen';
import { isBefore, isAfter, addDays, subDays, startOfDay, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';

const initialStaticMenuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/blog', label: 'Blog', icon: PenSquare },
  { href: '/dashboard/event', label: 'Events', icon: CalendarClock },
  { href: '/dashboard/categories', label: 'Categories', icon: LayoutList },
  { href: '/dashboard/extra-content', label: 'Extra Content', icon: FileJson },
  // Dynamic items will be inserted after Extra Content Management
  { href: '/dashboard/web-media', label: 'Web Media', icon: ImageIconLucide },
  { href: '/dashboard/query-forms', label: 'Query Forms', icon: HelpCircle },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Mail }, // Added Notifications link
  // { href: '/dashboard/developer-docs', label: 'Developer Docs', icon: BookText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  // { href: '/dashboard/settings?tab=billing', label: 'Billing', icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams(); // Initialize useSearchParams
  const queryClient = useQueryClient(); // Get query client instance
  const { toast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  const { data: currentUser, isLoading: isLoadingUser, isError: isUserError, error: userError } = useCurrentUser();
  const { data: metaFormats, isLoading: isLoadingMetaFormats, isError: isErrorMetaFormats } = useGetMetaFormats({staleTime: 1000 * 60 * 60 * 24});
  const { data: payments, isLoading: isLoadingPayments, isError: isErrorPayments } = useGetPayments();

  const [menuItems, setMenuItems] = React.useState<MenuItem[]>(initialStaticMenuItems);
  const [paymentToAlert, setPaymentToAlert] = React.useState<Payment | null>(null);
  const [showPaymentAlert, setShowPaymentAlert] = React.useState(false);
  const [isDashboardLocked, setIsDashboardLocked] = React.useState(false);

  const userName = currentUser?.username || 'User';
  const logoUrl = currentUser?.logo_url || null; // Get logo URL

  React.useEffect(() => {
    const checkAuthStatusAndFetchToken = async () => {
      setIsCheckingAuth(true);
      try {
        const token = await getAccessToken();
        if (!token && pathname && !['/login', '/register'].includes(pathname)) {
          router.replace('/login');
        }
      } catch (error) {
        console.error("DashboardLayout: Error checking auth status:", error);
        if (pathname && !['/login', '/register'].includes(pathname)) {
          router.replace('/login');
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuthStatusAndFetchToken();
  }, [router, pathname]);

  React.useEffect(() => {
    if (isLoadingMetaFormats || isErrorMetaFormats || !metaFormats) {
      setMenuItems(initialStaticMenuItems); // Reset or keep static if error/loading
      return;
    }

    const dynamicItems = metaFormats
      .filter(format => format.placing === 'sidebar' || format.placing === 'both')
      .map(format => ({
        href: `/dashboard/extra-content/render/${format.documentId}`,
        label: format.name || 'Unnamed Form',
        icon: FileJson, // Or a more specific icon if available
      }));

    if (dynamicItems.length > 0) {
      const extraContentIndex = initialStaticMenuItems.findIndex(item => item.href === '/dashboard/extra-content');
      let newMenuItems = [...initialStaticMenuItems];
      if (extraContentIndex !== -1) {
        newMenuItems.splice(extraContentIndex + 1, 0, ...dynamicItems);
      } else {
        // Fallback: append if "Extra Content Management" link isn't found (shouldn't happen)
        newMenuItems = [...newMenuItems, ...dynamicItems];
      }
      setMenuItems(newMenuItems);
    } else {
      setMenuItems(initialStaticMenuItems);
    }
  }, [metaFormats, isLoadingMetaFormats, isErrorMetaFormats]);


  React.useEffect(() => {
    if (isLoadingPayments || isErrorPayments || !payments) {
      setIsDashboardLocked(false);
      setPaymentToAlert(null);
      setShowPaymentAlert(false);
      return;
    }

    let lock = false;
    let alertForPayment: Payment | null = null;
    const today = startOfDay(new Date());
    const fourteenDaysAgo = subDays(today, 14);
    const fourteenDaysFromNow = addDays(today, 14);

    const unpaidPayments = payments.filter(p => p.Payment_Status === 'Unpaid');

    for (const payment of unpaidPayments) {
      if (payment.Last_date_of_payment) {
        const dueDate = startOfDay(parseISO(payment.Last_date_of_payment as string));
        if (isValid(dueDate) && isBefore(dueDate, fourteenDaysAgo)) {
          lock = true;
          break;
        }
      }
    }
    setIsDashboardLocked(lock);

    if (!lock) {
      let mostRelevantPayment: Payment | null = null;
      for (const payment of unpaidPayments) {
        if (payment.Last_date_of_payment) {
          const dueDate = startOfDay(parseISO(payment.Last_date_of_payment as string));
          if (!isValid(dueDate)) continue;

          const isOverdue = isBefore(dueDate, today);
          const isDueSoonOrOverdue = isOverdue || (isAfter(dueDate, subDays(today,1)) && isBefore(dueDate, fourteenDaysFromNow));

          if (isDueSoonOrOverdue) {
            if (!mostRelevantPayment || (mostRelevantPayment.Last_date_of_payment && isBefore(dueDate, startOfDay(parseISO(mostRelevantPayment.Last_date_of_payment as string))))) {
              mostRelevantPayment = payment;
            }
          }
        }
      }
      setPaymentToAlert(mostRelevantPayment);

      if (mostRelevantPayment?.id) {
        const dismissedKey = `paymentAlertDismissed_${mostRelevantPayment.id}`;
        const isDismissed = sessionStorage.getItem(dismissedKey) === 'true';
        setShowPaymentAlert(!isDismissed);
      } else {
        setShowPaymentAlert(false);
      }
    } else {
      setPaymentToAlert(null);
      setShowPaymentAlert(false);
    }
  }, [payments, isLoadingPayments, isErrorPayments]);

  const handleDismissPaymentAlert = () => {
    if (paymentToAlert?.id) {
      sessionStorage.setItem(`paymentAlertDismissed_${paymentToAlert.id}`, 'true');
    }
    setShowPaymentAlert(false);
  };

  const handlePayNowFromAlert = (paymentId?: string | number) => {
    let targetPath = '/dashboard/settings?tab=billing';
    if (paymentId !== undefined) {
      targetPath += `&paymentId=${paymentId}`;
    }
    router.push(targetPath);
    setShowPaymentAlert(false);
  };

  const handleLogout = async () => {
    await removeAccessToken();
    queryClient.clear(); // Clear the cache on logout
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    router.push('/login');
  };

  const isLoadingCombined = isCheckingAuth || isLoadingUser || isLoadingMetaFormats || isLoadingPayments;

  if (isLoadingCombined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (isUserError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading User Data</h2>
          <p className="text-muted-foreground mb-4">{userError?.message || "Could not load user information."}</p>
          <Button onClick={() => router.refresh()}>Retry</Button>
        </div>
      </div>
    );
  }
  
  // Correctly use searchParams to check for the 'tab' query parameter
  const canAccessBilling = pathname === '/dashboard/settings' && searchParams.get('tab') === 'billing';
  
  // Add null check for pathname before calling string methods like 'startsWith' or '!='
  const isPathnameValidForLockCheck = pathname !== null && pathname !== undefined;
  const effectiveLock = isDashboardLocked && !canAccessBilling && isPathnameValidForLockCheck && pathname !== '/dashboard/settings';

  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarNav menuItems={menuItems} />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header
          userName={userName}
          onLogout={handleLogout}
          menuItems={menuItems}
          logoUrl={logoUrl}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-muted/40 relative">
          {effectiveLock ? (
            <PaymentOverdueLockScreen />
          ) : (
            <>
              {showPaymentAlert && paymentToAlert && (
                <PaymentDueAlert
                  payment={paymentToAlert}
                  onDismiss={handleDismissPaymentAlert}
                  onPayNow={handlePayNowFromAlert}
                />
              )}
              {children}
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
    