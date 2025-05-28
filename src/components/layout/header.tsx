
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, UserCircle, LucideIcon, Settings, CreditCard } from 'lucide-react'; // Added Settings, CreditCard
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tooltip as RadixTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Breadcrumbs from './breadcrumbs';
import {
  SidebarContent as MobileSidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface HeaderProps {
  userName: string;
  onLogout: () => void;
  menuItems: MenuItem[];
}

const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production';

export default function Header({ userName, onLogout, menuItems }: HeaderProps) {
   const pathname = usePathname();
   const mobileMenuItems = menuItems;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 flex flex-col bg-sidebar text-sidebar-foreground">
                <SheetHeader className="border-b border-sidebar-border">
                  <SheetTitle asChild>
                    <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
                        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                          <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                                className="h-6 w-6 text-sidebar-primary"
                          >
                              <path d="M15 6.343a4.5 4.5 0 1 1 6.364 6.364L12 21.364l-9.364-9.364A4.5 4.5 0 1 1 9 6.343"/>
                              <path d="M12 12.727a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z"/>
                          </svg>
                          <span className="text-lg font-semibold">AuthFlow</span>
                        </Link>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <MobileSidebarContent className="flex-1 overflow-y-auto p-4 lg:p-6">
                  <SidebarMenu>
                    {mobileMenuItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                         <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            variant="default"
                            size="default"
                            className="justify-start"
                        >
                          <Link href={item.href}>
                            <item.icon className="mr-3 h-5 w-5" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </MobileSidebarContent>
                 <SheetFooter className="p-4 lg:p-6 border-t border-sidebar-border">
                     <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={onLogout}>
                         <LogOut className="h-4 w-4" /> Logout
                     </Button>
                 </SheetFooter>
            </SheetContent>
          </Sheet>
          <Breadcrumbs />
      </div>
      <div className="flex items-center gap-4 lg:gap-2 lg:gap-4">
        <div className="text-xs text-muted-foreground hidden sm:block capitalize">
          Environment: {environment}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto focus-visible:ring-0 focus-visible:ring-offset-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://picsum.photos/40/40" alt={userName} data-ai-hint="profile user" />
                <AvatarFallback><UserCircle className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden lg:inline-block">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings?tab=billing"> {/* Updated link */}
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
