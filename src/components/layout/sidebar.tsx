
'use client';

import * as React from 'react';
import Link from 'next/link';
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

  // menuItems prop already includes the updated label and path from DashboardLayout
  const updatedMenuItems = menuItems;

  return (
    <Sidebar className="hidden lg:flex">

       <SidebarHeader className="border-b border-sidebar-border">
         <div
           className={cn(
             "flex h-14 items-center", // Base styles
             state === 'expanded'
               ? "px-4 lg:px-6 justify-between" // Expanded: padding, space between Brand and Trigger
               : "px-2 flex-col justify-center items-center py-2 gap-0.5" // Collapsed: less padding, column, centered, small gap
           )}
         >
           <Link
             href="/dashboard"
             className={cn(
               "font-semibold",
               state === 'expanded' ? "text-lg" : "text-xl font-bold" // "M" larger when collapsed
             )}
             aria-label={state === 'expanded' ? "Mentos Dashboard" : "M Dashboard"}
           >
             {state === 'expanded' ? "Mentos" : "M"}
           </Link>

           <SidebarTrigger
             className={cn("h-7 w-7")} // Basic styling, positioning handled by parent div's flex properties
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
           © {new Date().getFullYear()} Mentos
         </div>
       </SidebarFooter>
    </Sidebar>
  );
}

    