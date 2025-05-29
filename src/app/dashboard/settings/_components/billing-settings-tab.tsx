
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetPayments } from '@/lib/queries/payment';
import type { Payment, BillingItem } from '@/types/payment';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Download, CreditCard, Eye, FileText, Info } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const formatDate = (dateString?: string | Date | null, dateFormat: string = 'PPP'): string => {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return isValid(date) ? format(date, dateFormat) : 'Invalid Date';
};

const calculateItemTaxableValue = (item: BillingItem): number => {
    const price = parseFloat(item.Price || '0');
    const quantity = item.Quantity || 0;
    const discountPercent = item.Discount || 0;
    const baseAmount = price * quantity;
    const discountAmount = baseAmount * (discountPercent / 100);
    return baseAmount - discountAmount;
};

const calculateItemTaxes = (item: BillingItem, taxableValue: number) => {
    const sgstAmount = taxableValue * ((item.SGST || 0) / 100);
    const cgstAmount = taxableValue * ((item.CGST || 0) / 100);
    const igstAmount = taxableValue * ((item.IGST || 0) / 100);
    // Assuming CESS is not part of BillingItem for now
    return { sgstAmount, cgstAmount, igstAmount };
};

const calculateItemTotal = (item: BillingItem): number => {
  const taxableValue = calculateItemTaxableValue(item);
  const { sgstAmount, cgstAmount, igstAmount } = calculateItemTaxes(item, taxableValue);
  return taxableValue + sgstAmount + cgstAmount + igstAmount;
};

const calculateOverallTotal = (items: BillingItem[] | null | undefined): number => {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
};


const addCardSchema = z.object({
  cardholderName: z.string().min(1, "Cardholder name is required."),
  cardNumber: z.string().min(13, "Card number is too short.").max(19, "Card number is too long.").regex(/^\d+$/, "Card number must be digits only."),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry date must be MM/YY format."),
  cvv: z.string().min(3, "CVV must be 3 or 4 digits.").max(4, "CVV must be 3 or 4 digits.").regex(/^\d+$/, "CVV must be digits only."),
});
type AddCardFormValues = z.infer<typeof addCardSchema>;


export default function BillingSettingsTab() {
  const { data: payments, isLoading, isError, error, refetch, isFetching } = useGetPayments();
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = React.useState<Payment | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);

  const addCardForm = useForm<AddCardFormValues>({
    resolver: zodResolver(addCardSchema),
    defaultValues: { cardholderName: "", cardNumber: "", expiryDate: "", cvv: "" },
  });

  const handlePayNow = (paymentId?: string | number) => { // Updated to string | number
    if (paymentId === undefined) {
      alert("Payment ID is undefined.");
      return;
    }
    alert(`Pay Now clicked for Payment ID: ${paymentId}`);
  };

  const handleDownloadInvoice = (paymentId?: string | number) => {
    if (paymentId === undefined) {
      alert("Payment ID is undefined.");
      return;
    }
    alert(`Download Invoice clicked for Payment ID: ${paymentId} (Feature coming soon)`);
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPaymentForDetails(payment);
    setIsDetailDialogOpen(true);
  };

  const onSaveCardSubmit = (data: AddCardFormValues) => {
    console.log("New Card Details:", data);
    alert("Card details logged to console. (UI Only)");
    addCardForm.reset();
  };

  if (isLoading || (isFetching && !payments)) {
    return (
      <div className="space-y-6">
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError && !isFetching) {
    return (
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
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-xl font-semibold">Pro Plan (Example)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="text-xl font-semibold">{formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>Review your past and outstanding invoices. {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}</CardDescription>
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
                        <TableRow key={payment.id || payment.documentId}>
                          <TableCell className="font-medium">#{payment.id || payment.documentId || 'N/A'}</TableCell>
                          <TableCell>
                            {formatDate(payment.Billing_From, 'MMM d, yyyy')} - {formatDate(payment.Billing_To, 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right font-semibold">₹{overallTotal.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={payment.Payment_Status === 'Pay' ? 'default' : payment.Payment_Status === 'Unpaid' ? 'destructive' : payment.Payment_Status === 'Wave off' ? 'secondary' : 'outline'}
                              className="capitalize whitespace-nowrap"
                            >
                              {payment.Payment_Status?.toLowerCase() || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(payment.Last_date_of_payment)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(payment)}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View Details</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDownloadInvoice(payment.id || payment.documentId)} disabled><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Download Invoice (Soon)</TooltipContent></Tooltip>
                              {payment.Payment_Status === 'Unpaid' && (
                                <Tooltip><TooltipTrigger asChild><Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => handlePayNow(payment.id || payment.documentId)}><CreditCard className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Pay Now</TooltipContent></Tooltip>
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

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your saved payment methods or add a new one.</CardDescription>
          </CardHeader>
          <CardContent>
             {/* Placeholder for listing saved cards */}
             <div className="mb-6 p-4 border border-dashed rounded-md text-center text-muted-foreground">
                 <Info className="mx-auto h-8 w-8 mb-2" />
                Saved payment methods will appear here. (Feature coming soon)
             </div>
             <Separator className="my-6"/>
             <h3 className="text-lg font-medium mb-4">Add New Card</h3>
            <Form {...addCardForm}>
              <form onSubmit={addCardForm.handleSubmit(onSaveCardSubmit)} className="space-y-4">
                <FormField control={addCardForm.control} name="cardholderName" render={({ field }) => (
                  <FormItem><FormLabel>Cardholder Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addCardForm.control} name="cardNumber" render={({ field }) => (
                  <FormItem><FormLabel>Card Number</FormLabel><FormControl><Input placeholder="•••• •••• •••• ••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={addCardForm.control} name="expiryDate" render={({ field }) => (
                    <FormItem><FormLabel>Expiry Date (MM/YY)</FormLabel><FormControl><Input placeholder="MM/YY" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addCardForm.control} name="cvv" render={({ field }) => (
                    <FormItem><FormLabel>CVV</FormLabel><FormControl><Input placeholder="•••" {...field} type="password" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={addCardForm.formState.isSubmitting}>
                  {addCardForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Card
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {selectedPaymentForDetails && (
          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent className="sm:max-w-[90%] max-h-[95vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-center text-xl">TAX INVOICE</DialogTitle>
                <DialogDescriptionComponent className="text-center">
                  Invoice #{selectedPaymentForDetails.id || selectedPaymentForDetails.documentId} | Period: {formatDate(selectedPaymentForDetails.Billing_From)} - {formatDate(selectedPaymentForDetails.Billing_To)}
                </DialogDescriptionComponent>
              </DialogHeader>
              <ScrollArea className="flex-1 my-2">
                <div className="p-4 space-y-4 border rounded-md">
                    {/* Invoice Header Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                            <h3 className="font-semibold">Your Company Name</h3>
                            <p>Your Address Line 1</p>
                            <p>City, State, Postal Code</p>
                            <p>GSTIN: YOUR_GSTIN</p>
                        </div>
                        <div className="text-right">
                            <p><span className="font-semibold">Invoice Date:</span> {formatDate(selectedPaymentForDetails.createdAt)}</p>
                            <p><span className="font-semibold">Due Date:</span> {formatDate(selectedPaymentForDetails.Last_date_of_payment)}</p>
                        </div>
                    </div>
                     <Separator />
                    {/* Customer & Billing Info (Placeholder) */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm my-4">
                        <div>
                            <h4 className="font-semibold mb-1">Customer Name</h4>
                            <p>{selectedPaymentForDetails.user?.username || 'N/A'}</p>
                            <p>GSTIN: (Customer GSTIN if available)</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Billing Address</h4>
                            <p>{selectedPaymentForDetails.user?.address || 'N/A'}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-1">Shipping Address</h4>
                            <p>{selectedPaymentForDetails.user?.address || '(Same as Billing)'}</p>
                        </div>
                    </div>
                     <Separator />

                  {/* Items Table - Invoice Style */}
                  <Table className="my-4 text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Item</TableHead>
                        <TableHead className="text-center">HSN/SAC</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST</TableHead>
                        {/* <TableHead className="text-right">UTGST</TableHead>
                        <TableHead className="text-right">CESS</TableHead> */}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPaymentForDetails.Items && selectedPaymentForDetails.Items.length > 0 ? (
                        selectedPaymentForDetails.Items.map((item, index) => {
                          const price = parseFloat(item.Price || '0');
                          const quantity = item.Quantity || 0;
                          const discountPercent = item.Discount || 0;
                          
                          const baseAmount = price * quantity;
                          const discountAmount = baseAmount * (discountPercent / 100);
                          const taxableValue = baseAmount - discountAmount;
                          
                          const { sgstAmount, cgstAmount, igstAmount } = calculateItemTaxes(item, taxableValue);
                          const itemTotal = taxableValue + sgstAmount + cgstAmount + igstAmount;

                          return (
                            <TableRow key={index}>
                              <TableCell>{item.Particulars || 'N/A'}</TableCell>
                              <TableCell className="text-center">{item.HSN || '-'}</TableCell>
                              <TableCell className="text-center">{quantity}</TableCell>
                              <TableCell className="text-right">₹{price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{discountPercent > 0 ? `₹${discountAmount.toFixed(2)} (${discountPercent}%)` : '-'}</TableCell>
                              <TableCell className="text-right">₹{taxableValue.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{cgstAmount > 0 ? `₹${cgstAmount.toFixed(2)} (${item.CGST || 0}%)` : '-'}</TableCell>
                              <TableCell className="text-right">{sgstAmount > 0 ? `₹${sgstAmount.toFixed(2)} (${item.SGST || 0}%)` : '-'}</TableCell>
                              {/* <TableCell className="text-right">-</TableCell> 
                              <TableCell className="text-right">-</TableCell>  */}
                              <TableCell className="text-right">₹{itemTotal.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow><TableCell colSpan={9} className="text-center h-24">No item details.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {/* Totals Section - Invoice Style */}
                    <div className="flex justify-end mt-4">
                        <div className="w-full max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between"><span>Taxable Amount:</span><span>₹{
                                (selectedPaymentForDetails.Items || []).reduce((sum, item) => sum + calculateItemTaxableValue(item), 0).toFixed(2)
                            }</span></div>
                            <div className="flex justify-between"><span>Total CGST:</span><span>₹{
                                (selectedPaymentForDetails.Items || []).reduce((sum, item) => sum + calculateItemTaxes(item, calculateItemTaxableValue(item)).cgstAmount, 0).toFixed(2)
                            }</span></div>
                            <div className="flex justify-between"><span>Total SGST:</span><span>₹{
                                (selectedPaymentForDetails.Items || []).reduce((sum, item) => sum + calculateItemTaxes(item, calculateItemTaxableValue(item)).sgstAmount, 0).toFixed(2)
                            }</span></div>
                            {/* Add IGST if applicable */}
                            <Separator />
                            <div className="flex justify-between font-semibold text-base"><span>Invoice Total:</span><span>₹{calculateOverallTotal(selectedPaymentForDetails.Items).toFixed(2)}</span></div>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center mt-6">
                        ABC Enterprises, New Delhi - 1111111 (Example Footer)
                    </div>

                </div>
              </ScrollArea>
              <DialogFooter className="border-t pt-4">
                <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}
