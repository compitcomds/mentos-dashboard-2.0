
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  CreditCard, // Added for Billing in static menu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { removeAccessToken, getAccessToken } from '@/lib/actions/auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/layout/header';
import SidebarNav from '@/components/layout/sidebar';
import { useCurrentUser } from '@/lib/queries/user';
import { useGetMetaFormats } from '@/lib/queries/meta-format';
import type { MetaFormat } from '@/types/meta-format';
import type { MenuItem } from '@/components/layout/header'; // Assuming MenuItem is defined here or in a common types file
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
  { href: '/dashboard/extra-content', label: 'Extra Content Management', icon: FileJson },
  // Dynamic items will be inserted after Extra Content Management
  { href: '/dashboard/web-media', label: 'Web Media', icon: ImageIconLucide },
  { href: '/dashboard/query-forms', label: 'Query Forms', icon: HelpCircle },
  { href: '/dashboard/developer-docs', label: 'Developer Docs', icon: BookText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  // Billing is now primarily accessed via settings dropdown, but keeping it here for direct access too if desired.
  // Or remove it if the dropdown is the only intended access point.
  // For now, keeping it, will point to the new settings tab.
  { href: '/dashboard/settings?tab=billing', label: 'Billing', icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  const { data: currentUser, isLoading: isLoadingUser, isError: isUserError, error: userError } = useCurrentUser();
  const { data: metaFormats, isLoading: isLoadingMetaFormats, isError: isErrorMetaFormats } = useGetMetaFormats();
  const { data: payments, isLoading: isLoadingPayments, isError: isErrorPayments } = useGetPayments();

  const [menuItems, setMenuItems] = React.useState<MenuItem[]>(initialStaticMenuItems);
  const [paymentToAlert, setPaymentToAlert] = React.useState<Payment | null>(null);
  const [showPaymentAlert, setShowPaymentAlert] = React.useState(false);
  const [isDashboardLocked, setIsDashboardLocked] = React.useState(false);

  const userName = currentUser?.username || 'User';

  React.useEffect(() => {
    const checkAuthStatusAndFetchToken = async () => {
      setIsCheckingAuth(true);
      try {
        const token = await getAccessToken();
        if (!token && !['/login', '/register'].includes(pathname)) {
          router.replace('/login');
        }
      } catch (error) {
        console.error("DashboardLayout: Error checking auth status:", error);
        if (!['/login', '/register'].includes(pathname)) {
          router.replace('/login');
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuthStatusAndFetchToken();
  }, [router, pathname]);

  React.useEffect(() => {
    if (metaFormats && !isLoadingMetaFormats && !isErrorMetaFormats) {
      const dynamicItems = metaFormats
        .filter(format => format.placing === 'sidebar' || format.placing === 'both')
        .map(format => ({
          href: `/dashboard/extra-content/render/${format.documentId}`,
          label: format.name || 'Unnamed Form',
          icon: FileJson,
        }));

      const extraContentIndex = initialStaticMenuItems.findIndex(item => item.href === '/dashboard/extra-content');
      let newMenuItems = [...initialStaticMenuItems];
      if (extraContentIndex !== -1) {
        newMenuItems.splice(extraContentIndex + 1, 0, ...dynamicItems);
      } else {
        newMenuItems = [...newMenuItems, ...dynamicItems];
      }
      setMenuItems(newMenuItems);
    } else if (!isLoadingMetaFormats) {
      setMenuItems(initialStaticMenuItems);
    }
  }, [metaFormats, isLoadingMetaFormats, isErrorMetaFormats]);


  React.useEffect(() => {
    if (isLoadingPayments || isErrorPayments || !payments) {
      setIsDashboardLocked(false);
      setPaymentToAlert(null);
      setShowPaymentAlert(false); // Ensure alert is hidden if payments aren't loaded
      return;
    }

    let lock = false;
    let alertForPayment: Payment | null = null;
    const today = startOfDay(new Date());
    const fourteenDaysAgo = subDays(today, 14);
    const fourteenDaysFromNow = addDays(today, 14); // Alert for payments due in the next 14 days

    const unpaidPayments = payments.filter(p => p.Payment_Status === 'Unpaid');

    // Check for lock condition first
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

    // If not locked, determine if an alert banner is needed
    if (!lock) {
      let mostRelevantPayment: Payment | null = null;

      for (const payment of unpaidPayments) {
        if (payment.Last_date_of_payment) {
          const dueDate = startOfDay(parseISO(payment.Last_date_of_payment as string));
          if (!isValid(dueDate)) continue;

          const isOverdue = isBefore(dueDate, today);
          // Alert if overdue OR due within the next 14 days
          const isDueSoonOrOverdue = isOverdue || (isAfter(dueDate, subDays(today,1)) && isBefore(dueDate, fourteenDaysFromNow));


          if (isDueSoonOrOverdue) {
            if (!mostRelevantPayment || isBefore(dueDate, startOfDay(parseISO(mostRelevantPayment.Last_date_of_payment as string)))) {
              mostRelevantPayment = payment;
            }
          }
        }
      }
      setPaymentToAlert(mostRelevantPayment);
      
      if (mostRelevantPayment) {
        const dismissedKey = `paymentAlertDismissed_${mostRelevantPayment.id}`;
        const isDismissed = sessionStorage.getItem(dismissedKey) === 'true';
        setShowPaymentAlert(!isDismissed);
      } else {
        setShowPaymentAlert(false);
      }
    } else {
      // If locked, don't show the regular payment alert banner
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
    if (paymentId !== undefined) {
      router.push(`/dashboard/settings?tab=billing&paymentId=${paymentId}`);
    } else {
      router.push(`/dashboard/settings?tab=billing`);
    }
    setShowPaymentAlert(false); // Dismiss alert on pay now attempt
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
  
  const canAccessBilling = pathname === '/dashboard/settings' && router.asPath.includes('tab=billing');
  const effectiveLock = isDashboardLocked && !canAccessBilling && pathname !== '/dashboard/settings';


  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarNav menuItems={menuItems} />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header
          userName={userName}
          onLogout={handleLogout}
          menuItems={menuItems}
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
