
'use client';

import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, X, CreditCard } from 'lucide-react';
import type { Payment } from '@/types/payment';
import { format, isBefore, startOfDay, parseISO, isValid } from 'date-fns';

interface PaymentDueAlertProps {
  payment: Payment;
  onDismiss: () => void;
  onPayNow: (paymentId?: string | number) => void;
}

const formatDate = (dateString?: string | Date | null): string => {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return isValid(date) ? format(date, 'PPP') : 'Invalid Date';
};

const calculateOverallTotal = (items: Payment['Items']): number => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => {
        const price = parseFloat(item.Price || '0');
        const quantity = item.Quantity || 0;
        const discountPercent = item.Discount || 0;
        const baseAmount = price * quantity;
        const discountAmount = baseAmount * (discountPercent / 100);
        const taxableValue = baseAmount - discountAmount;
        const sgstAmount = taxableValue * ((item.SGST || 0) / 100);
        const cgstAmount = taxableValue * ((item.CGST || 0) / 100);
        const igstAmount = taxableValue * ((item.IGST || 0) / 100);
        return sum + taxableValue + sgstAmount + cgstAmount + igstAmount;
    }, 0);
};

export default function PaymentDueAlert({ payment, onDismiss, onPayNow }: PaymentDueAlertProps) {
  if (!payment || payment.Payment_Status !== 'Unpaid') {
    return null;
  }

  const dueDate = payment.Last_date_of_payment ? parseISO(payment.Last_date_of_payment as string) : null;
  const today = startOfDay(new Date());
  const isOverdue = dueDate && isValid(dueDate) ? isBefore(dueDate, today) : false;
  const totalAmount = calculateOverallTotal(payment.Items);

  let title = "Payment Reminder";
  let description = `You have an unpaid invoice of ₹${totalAmount.toFixed(2)}.`;
  if (dueDate && isValid(dueDate)) {
    description += isOverdue
      ? ` This invoice was due on ${formatDate(dueDate)}.`
      : ` This invoice is due on ${formatDate(dueDate)}.`;
  } else {
    description += ` Please check your billing details.`;
  }

  return (
    <Alert variant="destructive" className="mb-6 rounded-md shadow-md flex">
      <AlertCircle className="h-5 w-5" />
      <div className="flex-grow ml-2">
        <AlertTitle className="font-semibold">{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2 ml-4">
        <Button
          variant="default"
          size="sm"
          onClick={() => onPayNow(payment.id || payment.documentId)}
          className="bg-white text-destructive hover:bg-gray-100 border border-destructive"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Pay Now
        </Button>
        <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8 text-destructive hover:bg-destructive/10">
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </Alert>
  );
}
