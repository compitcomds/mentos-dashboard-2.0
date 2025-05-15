
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

// Helper function to capitalize words and handle specific cases
const formatSegment = (segment: string): string => {
    if (segment === 'web-media') return 'Web Media'; // Specific case
    const words = segment.replace(/-/g, ' ').split(' ');
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  // Split path and remove empty segments
  const pathSegments = pathname.split('/').filter(Boolean);

  // Only render breadcrumbs if we are inside the dashboard
  if (pathSegments.length === 0 || pathSegments[0] !== 'dashboard') {
     return null;
   }

  // Remove 'dashboard' segment as it's implied by the base link
  const relevantSegments = pathSegments.slice(1);


  return (
    <nav aria-label="Breadcrumb" className="text-sm font-medium text-muted-foreground hidden md:flex">
      <ol className="flex items-center space-x-1.5">
        <li>
          {/* Base Dashboard link */}
          <Link href="/dashboard" className={cn("hover:text-foreground", relevantSegments.length === 0 ? 'text-foreground' : '')}>
            Dashboard
          </Link>
        </li>
        {relevantSegments.map((segment, index) => {
          // Construct the path for the current segment, adding back 'dashboard' for the href
          const href = '/dashboard/' + relevantSegments.slice(0, index + 1).join('/');
          const isLast = index === relevantSegments.length - 1;
          const label = formatSegment(segment); // Use helper for formatting

          return (
            <React.Fragment key={href}>
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li>
                {isLast ? (
                  <span className="text-foreground" aria-current="page">
                    {label}
                  </span>
                ) : (
                  <Link href={href} className="hover:text-foreground">
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
