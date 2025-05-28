
'use client'; // Hooks using client-side features like useToast need this

import { useMutation, useQueryClient } from "@tanstack/react-query"; // Added useQueryClient
import { loginUser, registerUser, forgotPassword, resetPassword, changePassword as changePasswordService } from "@/lib/services/auth";
import { useToast } from "@/hooks/use-toast";
import type {
    RegisterFormValues,
    LoginFormValues,
    LoginResponse,
    RegisterResponse,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    ChangePasswordFormValues, // Added
    ChangePasswordPayload, // Added
    GenericResponse
} from '@/types/auth';

// Query key for current user data, to invalidate after password change
const USER_QUERY_KEY = ['currentUser'];

export function useRegisterMutation() {
  const { toast } = useToast();

  return useMutation<RegisterResponse, Error, RegisterFormValues>({
    mutationFn: registerUser,
    onSuccess: (data: RegisterResponse) => {
      toast({
        title: 'Success!',
        description: data.message || 'Registration successful! User details update may follow.',
      });
      console.log("User registered successfully (initial step):", data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message
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

    return useMutation<LoginResponse, Error, LoginFormValues>({
        mutationFn: loginUser,
        onError: (error: any) => {
            const message = error.response?.data?.error?.message
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


export function useForgotPasswordMutation() {
  const { toast } = useToast();
  return useMutation<GenericResponse, Error, ForgotPasswordPayload>({
    mutationFn: forgotPassword,
    onSuccess: (data: GenericResponse) => {
      toast({
        title: 'Request Sent',
        description: data.message || 'Password reset instructions sent if email exists.',
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

export function useResetPasswordMutation() {
   const { toast } = useToast();
   return useMutation<LoginResponse, Error, ResetPasswordPayload>({
    mutationFn: resetPassword,
    onSuccess: (data: LoginResponse) => {
       toast({
        title: 'Success!',
        description: data.message || 'Password reset successfully.',
      });
      console.log("Password reset successful:", data);
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

export function useChangePasswordMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<GenericResponse, Error, ChangePasswordFormValues>({
    mutationFn: (data: ChangePasswordFormValues) => {
      const payload: ChangePasswordPayload = {
        currentPassword: data.currentPassword,
        password: data.password,
        passwordConfirmation: data.passwordConfirmation,
      };
      return changePasswordService(payload);
    },
    onSuccess: (data: GenericResponse) => {
      toast({
        title: 'Success!',
        description: data.message || 'Password changed successfully.',
      });
      // Optionally, refetch user data if password change affects session or user details
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      console.log("Password changed successfully:", data);
    },
    onError: (error: any) => {
      const strapiError = error.response?.data?.error;
      let message = error.message || 'Failed to change password.';

      if (strapiError && typeof strapiError === 'object') {
        message = `${strapiError.name || 'API Error'}: ${strapiError.message || 'Unknown Strapi error.'}`;
        if (strapiError.details && Object.keys(strapiError.details).length > 0) {
          message += ` Details: ${JSON.stringify(strapiError.details)}`;
        }
      } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
        message = `API Error (Status ${error.response.status || 'unknown'}): ${error.response.data.message}`;
      }

      toast({
        variant: 'destructive',
        title: 'Uh oh! Password Change Error.',
        description: message,
      });
      console.error("Change password error:", error.response?.data || error);
    },
  });
}
