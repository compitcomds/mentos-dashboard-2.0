
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, HelpCircle } from 'lucide-react';

export default function HelpSupportTab() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        If you need help or have any questions, please don't hesitate to reach out to our support team.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Mail className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">Email Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-1">For general inquiries and support requests:</p>
            <a href="mailto:support@example.com" className="font-medium text-primary hover:underline">
              support@example.com
            </a>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Phone className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">Phone Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-1">Available Monday - Friday, 9 AM - 5 PM (Your Timezone):</p>
            <p className="font-medium">+1 (555) 123-4567</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          <CardTitle className="text-lg">Frequently Asked Questions (FAQ)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3">
            Many common questions are answered in our FAQ section. Check it out for quick solutions:
          </p>
          <a href="/faq" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
            Visit our FAQ Page (Coming Soon)
          </a>
        </CardContent>
      </Card>

      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          We typically respond to support requests within 24-48 business hours.
        </p>
      </div>
    </div>
  );
}
