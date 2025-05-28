
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileSettingsTab from './_components/profile-settings-tab';
import BillingSettingsTab from './_components/billing-settings-tab';
import HelpSupportTab from './_components/help-support-tab';
import { User, CreditCard, LifeBuoy } from 'lucide-react';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/dashboard/settings?tab=${value}`, { scroll: false });
  };

  React.useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="profile" className="gap-2 py-2 sm:py-0">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 py-2 sm:py-0">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-2 py-2 sm:py-0">
            <LifeBuoy className="h-4 w-4" />
            Help & Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information and account settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          {/* The BillingSettingsTab will contain its own Card for main content */}
          <BillingSettingsTab />
        </TabsContent>

        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle>Help & Support</CardTitle>
              <CardDescription>Find help or get in touch with our support team.</CardDescription>
            </CardHeader>
            <CardContent>
              <HelpSupportTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
