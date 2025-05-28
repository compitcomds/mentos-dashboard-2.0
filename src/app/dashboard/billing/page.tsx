
'use client';

import * as React from 'react';
import { useGetPayments } from '@/lib/queries/payment';
import type { Payment, BillingItem } from '@/types/payment';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Download, CreditCard, ShoppingCart, CalendarDays } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFooterUI } from "@/components/ui/table"; // Renamed to avoid conflict
import { Separator } from '@/components/ui/separator';

const formatDate = (dateString?: string | Date | null): string => {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return isValid(date) ? format(date, 'PPP') : 'Invalid Date';
};

const calculateItemTotal = (item: BillingItem): number => {
  const price = parseFloat(item.Price || '0');
  const quantity = item.Quantity || 0;
  const sgst = item.SGST || 0;
  const cgst = item.CGST || 0;
  const igst = item.IGST || 0;
  const discount = item.Discount || 0;

  const baseAmount = price * quantity;
  const totalTax = baseAmount * (sgst / 100 + cgst / 100 + igst / 100);
  const discountedAmount = baseAmount - (baseAmount * (discount / 100));
  return discountedAmount + totalTax;
};

const calculateOverallTotal = (items: BillingItem[] | null | undefined): number => {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
};

export default function BillingPage() {
  const { data: payments, isLoading, isError, error, refetch, isFetching } = useGetPayments();

  const handlePayNow = (paymentId?: number) => {
    if (paymentId === undefined) {
        alert("Payment ID is undefined.");
        return;
    }
    alert(`Pay Now clicked for Payment ID: ${paymentId}`);
    // Implement Razorpay logic here in a future step
  };

  const handleDownloadInvoice = (paymentId?: number) => {
    if (paymentId === undefined) {
        alert("Payment ID is undefined.");
        return;
    }
    alert(`Download Invoice clicked for Payment ID: ${paymentId} (Feature coming soon)`);
    // Implement PDF generation and download here in a future step
  };


  if (isLoading || isFetching) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-1/3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Billing Information</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || 'Could not fetch billing data.'}
            <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Payments</h1>
        {isFetching && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      </div>

      {!payments || payments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No billing history found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payments.map((payment) => {
            const overallTotal = calculateOverallTotal(payment.Items);
            return (
              <Card key={payment.id} className="flex flex-col shadow-lg rounded-lg">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">Invoice #{payment.id || 'N/A'}</CardTitle>
                      <CardDescription>
                        Billing Period: {formatDate(payment.Billing_From)} - {formatDate(payment.Billing_To)}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        payment.Payment_Status === 'Pay' ? 'default' :
                        payment.Payment_Status === 'Unpaid' ? 'destructive' :
                        payment.Payment_Status === 'Wave off' ? 'secondary' :
                        'outline'
                      }
                      className="capitalize"
                    >
                      {payment.Payment_Status?.toLowerCase() || 'Unknown'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm">
                    <div className="flex items-center text-muted-foreground">
                        <CreditCard className="mr-2 h-4 w-4 text-primary" />
                        <span>Total Amount:</span>
                        <span className="ml-auto font-semibold text-foreground">₹{overallTotal.toFixed(2)}</span>
                    </div>
                     <div className="flex items-center text-muted-foreground">
                        <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                        <span>Last Date:</span>
                         <span className="ml-auto font-medium text-foreground">{formatDate(payment.Last_date_of_payment)}</span>
                    </div>

                  {payment.Items && payment.Items.length > 0 && (
                    <Accordion type="single" collapsible className="w-full pt-2">
                      <AccordionItem value={`items-${payment.id}`}>
                        <AccordionTrigger className="text-sm py-2 hover:no-underline">
                            <div className="flex items-center">
                                <ShoppingCart className="mr-2 h-4 w-4 text-primary/80"/> View Item Details ({payment.Items.length})
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-0">
                          <div className="border rounded-md overflow-hidden">
                            <Table className="text-xs">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-8">Particulars</TableHead>
                                  <TableHead className="h-8 text-right">Qty</TableHead>
                                  <TableHead className="h-8 text-right">Price</TableHead>
                                  <TableHead className="h-8 text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {payment.Items.map((item, index) => {
                                  const itemSubtotal = calculateItemTotal(item);
                                  return (
                                    <TableRow key={index}>
                                      <TableCell className="py-1.5 font-medium truncate max-w-[100px]">{item.Particulars}</TableCell>
                                      <TableCell className="py-1.5 text-right">{item.Quantity}</TableCell>
                                      <TableCell className="py-1.5 text-right">₹{parseFloat(item.Price || '0').toFixed(2)}</TableCell>
                                      <TableCell className="py-1.5 text-right">₹{itemSubtotal.toFixed(2)}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4 flex flex-col sm:flex-row justify-end items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadInvoice(payment.id)}
                    disabled // Placeholder for now
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" /> Download Invoice
                  </Button>
                  {payment.Payment_Status === 'Unpaid' && (
                    <Button
                      size="sm"
                      onClick={() => handlePayNow(payment.id)}
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Pay Now
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
