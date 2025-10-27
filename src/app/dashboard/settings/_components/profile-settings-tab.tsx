
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea'; // No longer using Textarea for address
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useCurrentUser, useUpdateUserProfileMutation } from '@/lib/queries/user';
import { useChangePasswordMutation } from '@/lib/queries/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';
import { Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription as CardDescriptionComponent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProfileFormValues, ChangePasswordFormValues, User as ApiUserPayload } from '@/types/auth'; // User renamed to ApiUserPayload
import { profileSchema, changePasswordSchema } from '@/types/auth';

export default function ProfileSettingsTab() {
  const { data: currentUser, isLoading: isLoadingUser, isError, error } = useCurrentUser();
  const updateUserProfileMutation = useUpdateUserProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      street: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      site_name: '',
      site_url: '',
      logo_url: '',
      blog_url_builder: '', // Initialize new field
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  React.useEffect(() => {
    if (currentUser) {
      // Parse existing address string
      const addressString = currentUser.address || '';
      const parts = addressString.split(',').map(part => part.trim());

      profileForm.reset({
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
        phone: currentUser.phone !== null && currentUser.phone !== undefined ? String(currentUser.phone) : '',
        street: parts[0] || '',
        address_line_2: parts[1] || '',
        city: parts[2] || '',
        state: parts[3] || '',
        postal_code: parts[4] || '',
        country: parts[5] || '',
        site_name: currentUser.site_name || '',
        site_url: currentUser.site_url || '',
        logo_url: currentUser.logo_url || '',
        blog_url_builder: currentUser.blog_url_builder || '', // Set new field
      });
    }
  }, [currentUser, profileForm]);

  const onProfileSubmit = (data: ProfileFormValues) => {
    if (!currentUser || currentUser.id === undefined) {
        profileForm.setError("root", { type: "manual", message: "User ID is missing. Cannot update profile."});
        return;
    }
    // Combine address fields into a single string
    const addressParts = [
        data.street,
        data.address_line_2,
        data.city,
        data.state,
        data.postal_code,
        data.country,
    ].filter(Boolean); // Remove empty or null parts
    const combinedAddress = addressParts.join(', ');

    // Exclude email from the payload as it's typically not updated here
    // Also exclude individual address fields from the direct payload to the service
    const { email, street, address_line_2, city, state, postal_code, country, ...profileUpdateData } = data;
    
    const updatePayload: Partial<ApiUserPayload> = {
      ...profileUpdateData,
      address: combinedAddress || null, // Send combined address, or null if all parts were empty
    };
    
    updateUserProfileMutation.mutate({ id: currentUser.id, payload: updatePayload as Partial<ProfileFormValues> });
  };

  const onChangePasswordSubmit = (data: ChangePasswordFormValues) => {
    changePasswordMutation.mutate(data, {
        onSuccess: () => {
            passwordForm.reset(); // Reset password form on success
        }
    });
  };

  if (isLoadingUser) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-24" />
        <Separator />
        <Skeleton className="h-10 w-1/3 mt-6" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (isError || !currentUser) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Profile</AlertTitle>
        <AlertDescriptionComponent>{(error as Error)?.message || 'Could not load your profile data.'}</AlertDescriptionComponent>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescriptionComponent>Update your personal details.</CardDescriptionComponent>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <FormField
                control={profileForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} value={field.value || ''} disabled={true} />
                    </FormControl>
                    <FormDescription>Email address cannot be changed here.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Your phone number" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h3 className="text-md font-medium pt-4 border-t">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="address_line_2"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt, suite, unit, building, floor, etc." {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input placeholder="CA" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="94105" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="US" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <h3 className="text-md font-medium pt-4 border-t">Site Configuration</h3>
                <FormField
                  control={profileForm.control}
                  name="site_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Awesome Site" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormDescription>Used for publisher name in structured data.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={profileForm.control}
                  name="site_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormDescription>The main URL of your website.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={profileForm.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormDescription>Full URL to your site's logo. Used for structured data.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="blog_url_builder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blog URL Template</FormLabel>
                      <FormControl>
                        <Input placeholder='"https://mysite.com/" + <blog-set.slug> + "/" + slug' {...field} value={field.value || ''} disabled={updateUserProfileMutation.isPending} />
                      </FormControl>
                      <FormDescription>Template for generating Canonical URLs. Use "slug" for the post slug and &lt;blog-set.slug&gt; for category slug.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
              {profileForm.formState.errors.root && (
                  <FormMessage>{profileForm.formState.errors.root.message}</FormMessage>
              )}
              <Button type="submit" disabled={updateUserProfileMutation.isPending}>
                {updateUserProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Change Password</CardTitle>
          <CardDescriptionComponent>Update your account password.</CardDescriptionComponent>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-6">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={changePasswordMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={changePasswordMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="passwordConfirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={changePasswordMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
