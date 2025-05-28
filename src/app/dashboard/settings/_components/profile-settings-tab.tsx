
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrentUser } from '@/lib/queries/user';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters.').optional().or(z.literal('')),
  email: z.string().email('Invalid email address.').optional(), // Email might not be updatable
  phone: z.string().min(10, 'Phone number seems too short.').max(15, 'Phone number seems too long.').optional().or(z.literal('')),
  address: z.string().min(5, 'Address must be at least 5 characters.').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileSettingsTab() {
  const { data: currentUser, isLoading, isError, error } = useCurrentUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false); // Mock submitting state

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  React.useEffect(() => {
    if (currentUser) {
      form.reset({
        full_name: currentUser.full_name || '',
        email: currentUser.email || '', // Usually not editable, but display it
        phone: String(currentUser.phone || ''),
        address: currentUser.address || '',
      });
    }
  }, [currentUser, form]);

  const onSubmit = (data: ProfileFormValues) => {
    setIsSubmitting(true);
    console.log('Profile Update Payload:', data);
    // Here you would typically call an update mutation
    // e.g., updateUserMutation.mutate(data, { onSuccess: ..., onError: ... });
    setTimeout(() => { // Simulate API call
      toast({
        title: 'Profile Updated (Simulated)',
        description: 'Your profile information has been saved.',
      });
      setIsSubmitting(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Profile</AlertTitle>
        <AlertDescription>{(error as Error)?.message || 'Could not load your profile data.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your@email.com" {...field} disabled={true} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="Your phone number" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Your address" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
