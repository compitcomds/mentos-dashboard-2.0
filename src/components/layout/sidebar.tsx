
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, HelpCircle, LayoutList, FileJson } from 'lucide-react'; // Added FileJson

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
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
  const { state } = useSidebar();

  // menuItems prop already includes Meta Formats from DashboardLayout
  const updatedMenuItems = menuItems;

  return (
    <Sidebar className="hidden lg:flex">

       <SidebarHeader className="border-b border-sidebar-border">
         <div className="flex h-14 items-center gap-2 px-4 lg:px-6 ">
           <Link href="/dashboard" className="flex items-center gap-2 font-semibold flex-grow overflow-hidden">
             <svg
                 xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="2"
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 className="h-6 w-6 text-sidebar-primary flex-shrink-0"
             >
                 <path d="M15 6.343a4.5 4.5 0 1 1 6.364 6.364L12 21.364l-9.364-9.364A4.5 4.5 0 1 1 9 6.343"/>
                 <path d="M12 12.727a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z"/>
             </svg>
             <span className="text-lg font-semibold text-foreground group-data-[state=collapsed]:hidden whitespace-nowrap">
                 AuthFlow
             </span>
           </Link>
             <SidebarTrigger asChild className={cn("ml-auto", state === 'expanded' ? 'lg:flex' : 'flex')}>
                 <Button variant="ghost" size="icon" className='h-7 w-7'>
                     <ChevronLeft />
                 </Button>
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
           © {new Date().getFullYear()} AuthFlow
         </div>
       </SidebarFooter>
    </Sidebar>
  );
}
