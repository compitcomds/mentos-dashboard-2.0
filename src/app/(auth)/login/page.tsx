
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
import { useToast } from '@/hooks/use-toast';
import { useLoginMutation } from '@/lib/queries/auth'; // Import the login mutation hook
import { loginSchema, type LoginFormValues, type LoginResponse } from '@/types/auth'; // Import schema and types
import { getAccessToken } from '@/lib/actions/auth'; // Import server action to get token

// Simple global variable for JWT (for preview environment debugging if needed)
// Still useful even with hardcoded token to see if service sets it
declare global {
    var tempJwt: string | undefined;
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingPage, setIsLoadingPage] = React.useState(true);
  const [displayedToken, setDisplayedToken] = React.useState<string | undefined | null>(null);
  const [tokenSource, setTokenSource] = React.useState<'hardcoded' | 'cookie' | 'none' | 'global'>('none'); // Track where the token came from
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const [loginResponseJson, setLoginResponseJson] = React.useState<string | null>(null); // State to hold the full JSON response


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mutation = useLoginMutation();

  async function onSubmit(data: LoginFormValues) {
    mutation.mutate(data, {
      onSuccess: (responseData) => {
        console.log("Full Login Response:", responseData); // Log the full response object

        // Display the full JSON response prettified
        setLoginResponseJson(JSON.stringify(responseData, null, 2));

        // Store JWT from response in state (for immediate display if needed)
        if (responseData.jwt) {
          // The service layer simulates setting the token (or uses hardcoded one)
          // We don't need to set it in state directly anymore for functionality
          // setDisplayedToken(responseData.jwt);
          // setTokenSource('state'); // Mark token came from state (API response)
           // Let handleShowToken reflect the actual source (hardcoded/cookie/global)
        } else {
            console.warn("JWT not found directly in login response data.");
            // setTokenSource('none');
        }

        toast({
          title: 'Success!',
          description: responseData.message || 'Login successful! Redirecting...',
        });

        // --- Redirect to dashboard ---
        router.push('/dashboard');
        // router.refresh(); // Refresh might be needed if layout depends on server state not updated by client nav
      },
      onError: (error: any) => {
        // Error handling is done within the mutation hook's onError
        console.error("Login component caught error (already handled by hook):", error);
        setLoginResponseJson(`Error: ${error.message}\n\n${JSON.stringify(error.response?.data, null, 2)}`); // Show error in JSON display
      }
    });
  }

   // Handle showing the current token
   const handleShowToken = async () => {
     setDisplayedToken(null); // Reset previous token/error
     setTokenError(null);
     setTokenSource('none'); // Reset source
     console.log("handleShowToken: Checking sources...");

     // 1. Use getAccessToken (handles hardcoded in preview, cookie in prod)
     console.log("handleShowToken: Checking token via getAccessToken action...");
     try {
         const token = await getAccessToken();
         const currentSource = process.env.NODE_ENV !== 'production' ? 'hardcoded' : (token ? 'cookie' : 'none');
         console.log(`handleShowToken: Token from action (source: ${currentSource}):`, token ? 'Token Found' : 'No Token');
         if (token) {
           setDisplayedToken(token);
           setTokenSource(currentSource); // Set the determined source
         } else {
            // 2. Fallback check global variable (useful if service failed to set cookie but set global)
             if (typeof window !== 'undefined' && window.tempJwt) {
                 console.log("handleShowToken: Found token in global variable (tempJwt) as fallback.");
                 setDisplayedToken(window.tempJwt);
                 setTokenSource('global');
             } else {
                 setDisplayedToken(`No token found (checked: ${currentSource}, global).`);
                 setTokenSource('none');
                 console.log("handleShowToken: No token found by action or in global var.");
             }
         }
     } catch (error: any) {
         console.error("handleShowToken: Error getting token from action:", error);
         setTokenError(`Error retrieving token: ${error.message || 'Unknown error'}`);
         setDisplayedToken(null);
         setTokenSource('none');
     }
   };


  React.useEffect(() => {
    // Simulate finishing loading, middleware handles redirects
    setIsLoadingPage(false);
     // Initial check for token on page load for display
     handleShowToken();
  }, [router]); // Rerun on router changes if needed

  if (isLoadingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} type="email" />
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
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {mutation.isPending ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>

          {/* Debug Section to Show Token */}
          {/* <div className="mt-6 border-t pt-4 text-center">
              <Button variant="outline" size="sm" onClick={handleShowToken} className="mb-2">
                Show Current Token (Debug)
              </Button>
              {tokenError && (
                <p className="mt-2 text-sm text-destructive">{tokenError}</p>
              )}
              {displayedToken !== null && !tokenError && (
                <div className="mt-2 break-all rounded-md bg-muted p-2 text-left text-xs text-muted-foreground">
                  <p className='font-semibold'>Current Access Token (Source: {tokenSource}):</p>
                  <pre className='whitespace-pre-wrap'>{displayedToken}</pre>
                </div>
              )}
          </div> */}
           {/* Display Full Login Response JSON */}
          {/* {loginResponseJson && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-semibold mb-2 text-center">Last Login Response:</h4>
              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48">
                {loginResponseJson}
              </pre>
            </div>
          )} */}

        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
           <p className="text-sm text-muted-foreground">
             Don't have an account?{' '}
             <Link href="/register" className="font-medium text-primary hover:underline">
               Register
             </Link>
           </p>
            {/* Optional: Keep a direct link to dashboard for testing if needed */}
            {/*
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:underline">
                 (Go to Dashboard)
              </Link>
            </p>
            */}
         </CardFooter>
      </Card>
    </div>
  );
}
