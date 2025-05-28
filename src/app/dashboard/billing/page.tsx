
'use client';

import * as React from 'react';
import { useGetPayments } from '@/lib/queries/payment';
import type { Payment, BillingItem } from '@/types/payment';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Download, CreditCard, ShoppingCart, CalendarDays, Eye, FileText } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionComponent, // Renamed to avoid conflict
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const formatDate = (dateString?: string | Date | null, dateFormat: string = 'PPP'): string => {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return isValid(date) ? format(date, dateFormat) : 'Invalid Date';
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
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = React.useState<Payment | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);

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

  const handleViewDetails = (payment: Payment) => {
    setSelectedPaymentForDetails(payment);
    setIsDetailDialogOpen(true);
  };

  if (isLoading || (isFetching && !payments)) { // Show skeleton if initial load or fetching with no data yet
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-9 w-1/3" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                             <TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                                <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError && !isFetching) {
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
    <TooltipProvider>
    <div className="space-y-8 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing & Payments</h1>
        {isFetching && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      </div>

      {/* Placeholder for Current Plan / Next Payment Summary - Appwrite style */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Subscription Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <p className="text-xl font-semibold text-foreground">Pro Plan (Example)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Next Billing Date</p>
            <p className="text-xl font-semibold text-foreground">{formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>Review your past and outstanding invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              No invoices found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Billing Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const overallTotal = calculateOverallTotal(payment.Items);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">#{payment.id || 'N/A'}</TableCell>
                        <TableCell>
                          {formatDate(payment.Billing_From, 'MMM d, yyyy')} - {formatDate(payment.Billing_To, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-semibold">₹{overallTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              payment.Payment_Status === 'Pay' ? 'default' : // Assuming 'Pay' means Paid
                              payment.Payment_Status === 'Unpaid' ? 'destructive' :
                              payment.Payment_Status === 'Wave off' ? 'secondary' :
                              payment.Payment_Status === 'Processing' ? 'outline' // Example for Processing
                              : 'outline'
                            }
                            className="capitalize whitespace-nowrap"
                          >
                            {payment.Payment_Status?.toLowerCase() || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payment.Last_date_of_payment)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(payment)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadInvoice(payment.id)}
                                  disabled // Placeholder
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download Invoice</TooltipContent>
                            </Tooltip>
                            {payment.Payment_Status === 'Unpaid' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handlePayNow(payment.id)}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pay Now</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Section - Placeholder */}
      <Card className="shadow-md">
          <CardHeader>
              <CardTitle className="text-lg">Payment Methods</CardTitle>
              <CardDescription>Manage your saved payment methods.</CardDescription>
          </CardHeader>
          <CardContent>
              <p className="text-sm text-muted-foreground">No payment methods saved. (Feature coming soon)</p>
              {/* <Button variant="outline" className="mt-2">Add Payment Method</Button> */}
          </CardContent>
      </Card>

      {/* Dialog for Invoice Details */}
      {selectedPaymentForDetails && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Invoice #{selectedPaymentForDetails.id} Details</DialogTitle>
              <DialogDescriptionComponent>
                Billing Period: {formatDate(selectedPaymentForDetails.Billing_From)} - {formatDate(selectedPaymentForDetails.Billing_To)}
              </DialogDescriptionComponent>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4 -mr-4 my-4">
              <div className="space-y-3">
                {selectedPaymentForDetails.Items && selectedPaymentForDetails.Items.length > 0 ? (
                  selectedPaymentForDetails.Items.map((item, index) => (
                    <div key={index} className="p-3 border rounded-md bg-muted/50">
                      <h4 className="font-semibold text-sm">{item.Particulars || 'Item'}</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span>Quantity:</span><span className="text-right text-foreground">{item.Quantity || 'N/A'}</span>
                        <span>Price:</span><span className="text-right text-foreground">₹{parseFloat(item.Price || '0').toFixed(2)}</span>
                        {item.Discount && item.Discount > 0 ? (
                          <>
                            <span>Discount:</span><span className="text-right text-foreground">{item.Discount}%</span>
                          </>
                        ) : null}
                        {item.SGST && item.SGST > 0 ? (
                           <><span>SGST:</span><span className="text-right text-foreground">{item.SGST}%</span></>
                        ) : null}
                         {item.CGST && item.CGST > 0 ? (
                           <><span>CGST:</span><span className="text-right text-foreground">{item.CGST}%</span></>
                        ) : null}
                         {item.IGST && item.IGST > 0 ? (
                           <><span>IGST:</span><span className="text-right text-foreground">{item.IGST}%</span></>
                        ) : null}
                        <span className="font-medium">Subtotal:</span><span className="text-right font-medium text-foreground">₹{calculateItemTotal(item).toFixed(2)}</span>
                      </div>
                      {item.Description && <p className="text-xs mt-1">{item.Description}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No item details available for this invoice.</p>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="border-t pt-4">
              <h3 className="text-lg font-semibold mr-auto">
                Overall Total: ₹{calculateOverallTotal(selectedPaymentForDetails.Items).toFixed(2)}
              </h3>
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </TooltipProvider>
  );
}

    