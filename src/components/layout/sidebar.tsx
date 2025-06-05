
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

  // menuItems prop already includes the updated label and path from DashboardLayout
  const updatedMenuItems = menuItems;

  return (
    <Sidebar className="hidden lg:flex">

       <SidebarHeader className="border-b border-sidebar-border">
         <div className="flex h-14 items-center gap-2 px-4 lg:px-6 ">
           <Link href="/dashboard" className="flex items-left justify-between font-semibold flex-grow w-full ">
            
             <span className="">
              {state === 'expanded'?"Mentos" :"M"}
             </span>
           </Link>
             <SidebarTrigger asChild className={cn("ml-auto", state === 'expanded' ? 'lg:flex' : 'flex')}>
                 <Button variant="ghost" size="icon" className='h-7 w-7'>
                  {state === 'expanded'?<ChevronLeft /> :<ChevronRight/>}
                     
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
           © {new Date().getFullYear()} Mentos
         </div>
       </SidebarFooter>
    </Sidebar>
  );
}
