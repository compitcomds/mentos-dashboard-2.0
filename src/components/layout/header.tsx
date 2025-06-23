"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, UserCircle, LucideIcon, Settings, CreditCard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import Breadcrumbs from "./breadcrumbs";
import {
  SidebarContent as MobileSidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "./notification-bell";

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface HeaderProps {
  userName: string;
  onLogout: () => void;
  menuItems: MenuItem[];
}

const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";

export default function Header({ userName, onLogout, menuItems }: HeaderProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const mobileMenuItems = menuItems;

  const handleLogoutWithCacheClear = () => {
    // First, clear the React Query cache from memory and localStorage
    queryClient.clear();
    // Then, call the original logout function which handles token removal and redirect
    onLogout();
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 sm:h-14 items-center justify-between gap-2 sm:gap-4 border-b bg-background px-3 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden h-8 w-8 sm:h-9 sm:w-9">
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 flex flex-col bg-sidebar text-sidebar-foreground">
            <SheetHeader className="border-b border-sidebar-border">
              <SheetTitle asChild>
                <div className="flex h-12 items-center gap-2 px-3 lg:px-4">
                  <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <span className="text-md sm:text-lg font-semibold">Mentos</span>
                  </Link>
                </div>
              </SheetTitle>
            </SheetHeader>
            <MobileSidebarContent className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
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
            <SheetFooter className="p-3 sm:p-4 lg:p-6 border-t border-sidebar-border">
              <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleLogoutWithCacheClear}>
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
        <div className="text-xs text-muted-foreground hidden sm:block capitalize">
          Env: {environment}
        </div>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 h-auto focus-visible:ring-0 focus-visible:ring-offset-0">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage src="https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png" alt={userName} data-ai-hint="profile user" />
                <AvatarFallback>
                  <UserCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline-block">{userName}</span>
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
              <Link href="/dashboard/settings?tab=billing">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogoutWithCacheClear}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}