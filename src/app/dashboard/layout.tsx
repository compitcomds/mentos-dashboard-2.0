
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, PenSquare, Settings, Loader2, Image as ImageIconLucide, CalendarClock, BookText, HelpCircle, LayoutList, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { removeAccessToken, getAccessToken } from '@/lib/actions/auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/layout/header';
import SidebarNav from '@/components/layout/sidebar';
import { useCurrentUser } from '@/lib/queries/user';
import { Button } from '@/components/ui/button';

const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production';

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
  const userName = currentUser?.username || 'User';

  React.useEffect(() => {
    const checkAuthStatusAndFetchToken = async () => {
      setIsCheckingAuth(true);
      let token: string | undefined = undefined;

      try {
        token = await getAccessToken();

        if (!token) {
            if (!['/login', '/register'].includes(pathname)) {
                 router.replace('/login');
            }
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

  const handleLogout = async () => {
    try {
      await removeAccessToken();
      toast({ title: 'Logged out successfully.' });
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        variant: 'destructive',
        title: 'Logout failed.',
        description: 'Could not log out. Please try again.',
      });
    }
  };

  const isLoading = isCheckingAuth || isLoadingUser;

  if (isLoading) {
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

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/blog', label: 'Blog', icon: PenSquare },
    { href: '/dashboard/event', label: 'Events', icon: CalendarClock },
    { href: '/dashboard/categories', label: 'Categories', icon: LayoutList },
    { href: '/dashboard/extra-content', label: 'Extra Content Management', icon: FileJson },
    { href: '/dashboard/web-media', label: 'Web Media', icon: ImageIconLucide },
    { href: '/dashboard/query-forms', label: 'Query Forms', icon: HelpCircle },
    { href: '/dashboard/developer-docs', label: 'Developer Docs', icon: BookText },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarNav menuItems={menuItems} />
       <SidebarInset className="flex flex-col min-h-screen">
         <Header
          userName={userName}
          onLogout={handleLogout}
          menuItems={menuItems}
        />
         <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-muted/40">
           {children}
         </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
