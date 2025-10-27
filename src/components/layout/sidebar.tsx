
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import Next.js Image component
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, HelpCircle, LayoutList, FileJson, ChevronRight } from 'lucide-react';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger, // Import SidebarTrigger from ui/sidebar
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar, // Import useSidebar to get state
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/lib/queries/user'; // Import to get user data for logo


interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarNavProps {
  menuItems: MenuItem[];
}

export default function SidebarNav({ menuItems }: SidebarNavProps) {
  const pathname = usePathname();
  const { state } = useSidebar(); // Get sidebar state
  const { data: currentUser } = useCurrentUser(); // Fetch user data
  const logoUrl = currentUser?.logo_url || null; // Get logo URL
  const siteName = "Mentos"; // Static name

  // menuItems prop already includes the updated label and path from DashboardLayout
  const updatedMenuItems = menuItems;

  return (
    <Sidebar className="hidden lg:flex">

       <SidebarHeader className="border-b border-sidebar-border">
         <div
           className={cn(
             "flex h-14 items-center", // Base styles, height adjusted
             state === 'expanded'
               ? "px-4 lg:px-6 justify-between" // Expanded: padding, space between Brand and Trigger
               : "px-2 justify-center" // Collapsed: centered
           )}
         >
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-2 font-semibold",
                state === 'expanded' ? "text-lg" : "text-base"
              )}
              aria-label={state === 'expanded' ? `${siteName} Dashboard` : "Dashboard"}
            >
              {logoUrl ? (
                <Image src={logoUrl} alt={`${siteName} Logo`} width={32} height={32} className="h-8 w-auto rounded-sm object-contain" unoptimized />
              ) : (
                <span className="p-2 bg-muted rounded-md text-xl font-bold">
                    {siteName.charAt(0).toUpperCase()}
                </span>
              )}
               {state === 'expanded' && <span className="inline-block">{siteName}</span>}
            </Link>

           <SidebarTrigger
             className={cn("h-7 w-7", state === 'expanded' ? 'ml-auto' : 'hidden')} // Use ml-auto for spacing, hide when collapsed (as it's outside the flow)
           >
             {/* Explicitly pass the icons to SidebarTrigger */}
             {state === 'expanded' ? <ChevronLeft /> : <ChevronRight />}
           </SidebarTrigger>
         </div>
       </SidebarHeader>

      <SidebarContent className="flex-1 overflow-x-hidden overflow-y-auto p-4 ">
        <SidebarMenu>
          {updatedMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
               <SidebarMenuButton
                 asChild
                 isActive={pathname === item.href}
                 tooltip={item.label}
                 variant="default"
                 size="default"
                 className="justify-start"
                 href={item.href}
               >
                 <Link href={item.href}>
                   <item.icon className="mr-3 h-5 w-5 group-data-[size=icon]:mr-0" />
                   <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
                 </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

       <SidebarFooter className="p-4 lg:p-6 border-t border-sidebar-border w-full">
         <div className="text-xs text-muted-foreground group-data-[state=collapsed]:hidden text-center">
           Developed by <a href="https://compitcom.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">compitcom.com</a>
         </div>
       </SidebarFooter>
    </Sidebar>
  );
}
