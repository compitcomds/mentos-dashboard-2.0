"use client";

import Link from 'next/link';
import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Brain className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            Mentos 2.0
          </span>
        </Link>
        <nav className="flex flex-1 items-center space-x-4">
          {/* Add navigation links here if needed */}
          {/* <Link href="/features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Features</Link> */}
        </nav>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">Sign In</Button>
          <Button size="sm">Sign Up</Button>
        </div>
      </div>
    </header>
  );
}
