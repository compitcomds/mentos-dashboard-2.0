
'use client'; // Hooks using client-side features like useToast need this

import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser, forgotPassword, resetPassword } from "@/lib/services/auth"; // Import API call functions from the service
import { useToast } from "@/hooks/use-toast"; // Use the existing shadcn toast hook
import type {
    RegisterFormValues,
    LoginFormValues,
    LoginResponse,
    RegisterResponse,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    GenericResponse
} from '@/types/auth'; // Import types

export function useRegisterMutation() {
  const { toast } = useToast();

  return useMutation<RegisterResponse, Error, RegisterFormValues>({ // Use specific RegisterResponse type
    mutationFn: registerUser, // Use the imported API call function
    onSuccess: (data: RegisterResponse) => {
      toast({
        title: 'Success!',
        description: data.message || 'Registration successful! User details update may follow.', // Adjust message
      });
      console.log("User registered successfully (initial step):", data);
      // User details update happens within registerUser service function now
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message // Strapi often nests errors
                     || error.response?.data?.message
                     || error.message
                     || 'Registration failed.';
      toast({
        variant: 'destructive',
        title: 'Uh oh! Registration Error.',
        description: message,
      });
      console.error("Registration error:", error.response?.data || error);
    },
  });
}

export function useLoginMutation() {
    const { toast } = useToast();

    return useMutation<LoginResponse, Error, LoginFormValues>({ // Use specific LoginResponse type
        mutationFn: loginUser, // Use the imported API call function
        // onSuccess will be handled in the component to allow for redirection and token setting
        onError: (error: any) => {
            const message = error.response?.data?.error?.message // Strapi specific error path
                         || error.response?.data?.message
                         || error.message
                         || 'Login failed.';
            toast({
                variant: 'destructive',
                title: 'Uh oh! Login Error.',
                description: message,
            });
            console.error("Login error:", error.response?.data || error);
        },
    });
}


// Updated hook for Forgot Password
export function useForgotPasswordMutation() {
  const { toast } = useToast();
  return useMutation<GenericResponse, Error, ForgotPasswordPayload>({ // Use correct types
    mutationFn: forgotPassword, // Use the imported service function
    onSuccess: (data: GenericResponse) => {
      toast({
        title: 'Request Sent',
        description: data.message || 'Password reset instructions sent if email exists.', // More robust message
      });
      console.log("Forgot password request successful:", data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message
                     || error.response?.data?.message
                     || error.message
                     || 'Failed to send reset instructions.';
       toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: message,
      });
      console.error("Forgot password error:", error.response?.data || error);
    },
  });
}

// Updated hook for Reset Password
export function useResetPasswordMutation() {
   const { toast } = useToast();
   return useMutation<LoginResponse, Error, ResetPasswordPayload>({ // Use correct types, assuming LoginResponse on success
    mutationFn: resetPassword, // Use the imported service function
    onSuccess: (data: LoginResponse) => {
       toast({
        title: 'Success!',
        description: data.message || 'Password reset successfully.',
      });
      console.log("Password reset successful:", data);
      // Potentially trigger login state update or redirect here or in the component
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message
                    || error.response?.data?.message
                    || error.message
                    || 'Failed to reset password.';
       toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: message,
      });
      console.error("Reset password error:", error.response?.data || error);
    },
  });
}
