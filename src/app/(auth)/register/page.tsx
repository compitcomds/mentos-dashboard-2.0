
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { useToast } from '@/hooks/use-toast';
import { useRegisterMutation } from '@/lib/queries/auth'; // Import the mutation hook
import { registerSchema, type RegisterFormValues, type RegisterResponse } from '@/types/auth'; // Import schema and type


export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast(); // Keep using the existing toast hook
  const [isLoadingPage, setIsLoadingPage] = React.useState(true); // Add loading state

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '', // Keep as string in form
      address: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Use the dedicated mutation hook
  const mutation = useRegisterMutation();

  // Define the onSubmit handler using the mutation hook
  function onSubmit(data: RegisterFormValues) {
    // The mutation hook expects RegisterFormValues directly
    // The registerUser service function now handles mapping and potential subsequent updates
    mutation.mutate(data, {
      onSuccess: (responseData: RegisterResponse) => {
        // Service layer handles setting the token.
        // Hook's onSuccess handles the success toast.
        toast({
            title: 'Registration Initiated!',
            description: responseData.message || 'Account created. Redirecting...',
        });
        // Redirect to login page after successful registration
        // Or redirect to a 'verify email' page or dashboard if login happens automatically
        router.push('/login');
      },
      onError: (error: any) => {
         // Error toast is handled globally in the hook's onError
         console.error("Register component caught error (already handled by hook):", error);
      }
    });
  }

   // Simulate page loading finish (middleware handles auth redirect)
   React.useEffect(() => {
    // In a real scenario without middleware doing the redirect,
    // you might check auth status here and redirect if already logged in.
    // e.g., checkAuth().then(isAuth => if(isAuth) router.replace('/dashboard'))
    // Since middleware handles it, we just finish loading.
    setIsLoadingPage(false);
  }, [router]);

  // Show loading indicator while page/auth check potentially happens
  if (isLoadingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary py-12">
      <Card className="w-full max-w-lg shadow-lg"> {/* Increased max-width */}
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Register</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Full Name" {...field} />
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
                      <Input placeholder="m@example.com" {...field} type="email"/>
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
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      {/* Keep type="text" for flexibility, validation handles format */}
                      <Input placeholder="123-456-7890" {...field} type="tel" />
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
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Main St, Anytown, USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {mutation.isPending ? 'Registering...' : 'Register'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
