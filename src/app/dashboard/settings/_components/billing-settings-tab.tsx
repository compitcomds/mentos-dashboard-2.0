
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
import { AlertCircle, Loader2, Download, CreditCard, Eye, FileText, Info, PackagePlus, CircleDollarSign, HardDrive, Trash2 } from 'lucide-react'; // Added Trash2
import { format, parseISO, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCurrentUser } from '@/lib/queries/user';
import { useGetUserResource, useUpdateUserResource } from '@/lib/queries/user-resource';
import { useGetCardDetails, useCreateCardDetail, useDeleteCardDetail } from '@/lib/queries/card-detail'; // Added card detail hooks
import type { CardDetail, CreateCardDetailPayload } from '@/types/card-detail'; // Added card detail types
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label'; // Re-added Label

const formatBytesForDisplayLocal = (bytes?: number | null, decimals = 2): string => {
    if (bytes === null || bytes === undefined || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeValue = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return sizeValue + ' ' + (sizes[i] || 'Bytes');
};

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

const cardDetailFormSchema = z.object({
  card_holder_name: z.string().min(1, "Cardholder name is required."),
  card_number: z.string().min(13, "Card number is too short.").max(19, "Card number is too long.").regex(/^\d+$/, "Card number must be digits only."),
  Expiry_Date: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry date must be MM/YY format."),
  cvv: z.string().min(3, "CVV must be 3 or 4 digits.").max(4, "CVV must be 3 or 4 digits.").regex(/^\d+$/, "CVV must be digits only."),
});
type CardDetailFormValues = z.infer<typeof cardDetailFormSchema>;

const storageUpgradeOptions = [
    { label: "+5 GB", value: 5 }, { label: "+10 GB", value: 10 },
    { label: "+15 GB", value: 15 }, { label: "+20 GB", value: 20 },
    { label: "+25 GB", value: 25 },
];
const COST_PER_GB_RUPEES = 85;

export default function BillingSettingsTab() {
  const { data: currentUser } = useCurrentUser();
  const { data: payments, isLoading: isLoadingPayments, isError: isPaymentsError, error: paymentsError, refetch: refetchPayments, isFetching: isFetchingPayments } = useGetPayments();
  const { data: userResource, isLoading: isLoadingUserResource, refetch: refetchUserResource } = useGetUserResource();
  const updateUserResourceMutation = useUpdateUserResource();
  const { data: cardDetails, isLoading: isLoadingCardDetails, refetch: refetchCardDetails } = useGetCardDetails();
  const createCardDetailMutation = useCreateCardDetail();
  const deleteCardDetailMutation = useDeleteCardDetail(); // Placeholder

  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = React.useState<Payment | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);
  const [selectedStorageUpgradeGB, setSelectedStorageUpgradeGB] = React.useState<number | null>(null);

  const cardForm = useForm<CardDetailFormValues>({
    resolver: zodResolver(cardDetailFormSchema),
    defaultValues: { card_holder_name: "", card_number: "", Expiry_Date: "", cvv: "" },
  });

  const handlePayNow = (paymentId?: string | number) => {
    if (paymentId === undefined) { alert("Payment ID is undefined."); return; }
    alert(`Pay Now clicked for Payment ID: ${paymentId}. Implement Razorpay flow.`);
  };

  const handleDownloadInvoice = (paymentId?: string | number) => {
    if (paymentId === undefined) { alert("Payment ID is undefined."); return; }
    const paymentToPrint = payments?.find(p => (p.id && p.id.toString() === String(paymentId)) || (p.documentId && p.documentId === String(paymentId)));
    if (!paymentToPrint) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invoice data not found.' });
      return;
    }
    // Logic to render InvoiceTemplate to hidden iframe and print
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      // Dynamically render component to string (simplified - real-world needs ReactDOMServer or a dedicated solution)
      // This part is complex for client-side only React, usually print is handled differently or server-side.
      // For a pure client-side quick hack, you'd typically render to a new window or a specific div and print that.
      // The existing logic with selectedPaymentForPrint in state and rendering the component to a new window/iframe is okay for a prototype.
      // This part remains as a placeholder.
      iframeDoc.open();
      iframeDoc.write('<html><head><title>Invoice</title></head><body><div>Invoice Content Here (Render InvoiceTemplate)</div></body></html>');
      iframeDoc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    // document.body.removeChild(iframe); // Clean up iframe
    console.log(`Download Invoice triggered for ${paymentId}. Actual print to PDF logic needed.`);
    toast({ title: "Download Started (Simulated)", description: "Your invoice download should begin shortly." });
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPaymentForDetails(payment);
    setIsDetailDialogOpen(true);
  };

  const onSaveCardSubmit = (data: CardDetailFormValues) => {
    createCardDetailMutation.mutate(data, {
      onSuccess: () => {
        cardForm.reset();
        // refetchCardDetails(); // Already handled by queryClient.invalidateQueries in the hook
      }
    });
  };

  const handleDeleteCard = (documentId: string | undefined) => {
      if (!documentId) {
          toast({ variant: "destructive", title: "Error", description: "Card ID missing." });
          return;
      }
      // For now, using alert as deleteCardDetailService is a placeholder
      alert(`Placeholder: Delete card with ID: ${documentId}`);
      // deleteCardDetailMutation.mutate({ documentId });
  };

  const handlePurchaseStorage = () => {
    if (!selectedStorageUpgradeGB || !userResource || !userResource.documentId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a storage amount or user resource not found." });
      return;
    }
    const currentTotalStorageKB = userResource.storage; // Value from API is in KB
    const upgradeAmountInKB = selectedStorageUpgradeGB * 1024 * 1024; // Convert selected GB to KB
    const newTotalStorageKB = currentTotalStorageKB + upgradeAmountInKB;
    const cost = selectedStorageUpgradeGB * COST_PER_GB_RUPEES;

    alert(`Simulating purchase of ${selectedStorageUpgradeGB}GB for ₹${cost}. New total storage will be ${formatBytesForDisplayLocal(newTotalStorageKB * 1024)} (sent as ${newTotalStorageKB} KB).`);

    updateUserResourceMutation.mutate(
      { documentId: userResource.documentId, payload: { storage: newTotalStorageKB } },
      {
        onSuccess: () => {
          toast({ title: "Storage Upgraded", description: `Your storage has been increased to ${formatBytesForDisplayLocal(newTotalStorageKB * 1024)}.` });
          setSelectedStorageUpgradeGB(null);
          // refetchUserResource(); // Handled by query invalidation in hook
        },
      }
    );
  };

  const isLoading = isLoadingPayments || isLoadingUserResource || isLoadingCardDetails;
  const isError = isPaymentsError; // Assuming payments error is primary for now
  const error = paymentsError;

  const currentTotalStorageKB = userResource?.storage ?? 0;
  const currentUsedStorageKB = userResource?.used_storage ?? 0;
  const storageUsagePercent = currentTotalStorageKB > 0 ? (currentUsedStorageKB / currentTotalStorageKB) * 100 : 0;

  if (isLoading && !payments && !userResource && !cardDetails) {
    return (
      <div className="space-y-6">
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError && !isFetchingPayments) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Billing Information</AlertTitle>
        <AlertDescription>
          {(error as Error)?.message || 'Could not fetch billing data.'}
          <Button onClick={() => refetchPayments()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetchingPayments}>
            {isFetchingPayments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                <CardTitle>Account Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <div>
                    <h3 className="text-lg font-medium mb-2">Current Subscription</h3>
                    <p className="text-sm text-muted-foreground">Plan: <span className="text-foreground font-semibold">Pro Plan (Example)</span></p>
                    <p className="text-sm text-muted-foreground">Next Billing: <span className="text-foreground font-semibold">{formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}</span></p>
                </div>
                <div>
                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2"><HardDrive className="h-5 w-5" /> Storage</h3>
                    {isLoadingUserResource && !userResource ? (
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-3/4" />
                            <Skeleton className="h-2 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ) : userResource ? (
                        <>
                            <Progress value={storageUsagePercent} className="w-full h-2 mb-1" />
                            <p className="text-xs text-muted-foreground">
                                {formatBytesForDisplayLocal(currentUsedStorageKB * 1024)} of {formatBytesForDisplayLocal(currentTotalStorageKB * 1024)} used
                            </p>
                            <p className="text-xs text-muted-foreground">({storageUsagePercent.toFixed(1)}%)</p>
                        </>
                    ) : (
                         <p className="text-xs text-muted-foreground">Storage info unavailable.</p>
                    )}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><PackagePlus className="h-6 w-6"/> Upgrade Storage</CardTitle>
                <CardDescription>Add more storage to your account. (1GB = ₹100, with 15% discount = ₹85/GB)</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingUserResource && !userResource ? (
                     <Skeleton className="h-20 w-full" />
                ) : (
                <RadioGroup
                    value={selectedStorageUpgradeGB?.toString()}
                    onValueChange={(value) => setSelectedStorageUpgradeGB(value ? parseInt(value) : null)}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4"
                >
                    {storageUpgradeOptions.map(option => (
                    <Label
                        key={option.value}
                        htmlFor={`storage-upgrade-${option.value}`}
                        className={`border rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors
                                    ${selectedStorageUpgradeGB === option.value ? 'border-primary ring-2 ring-primary bg-primary/5' : 'border-border'}`}
                    >
                        <RadioGroupItem value={option.value.toString()} id={`storage-upgrade-${option.value}`} className="sr-only" />
                        <div className="text-lg font-semibold">{option.label}</div>
                        <div className="text-sm text-muted-foreground">₹{(option.value * COST_PER_GB_RUPEES).toLocaleString()}</div>
                    </Label>
                    ))}
                </RadioGroup>
                )}
                {selectedStorageUpgradeGB && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm">
                        You selected: <strong>{selectedStorageUpgradeGB} GB</strong><br />
                        Cost: <strong>₹{(selectedStorageUpgradeGB * COST_PER_GB_RUPEES).toLocaleString()}</strong> (at ₹{COST_PER_GB_RUPEES}/GB after discount)<br />
                        {userResource && `Your new total storage will be: ${formatBytesForDisplayLocal((currentTotalStorageKB + (selectedStorageUpgradeGB * 1024 * 1024)) * 1024)}`}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    onClick={handlePurchaseStorage}
                    disabled={!selectedStorageUpgradeGB || updateUserResourceMutation.isPending || isLoadingUserResource}
                >
                    {updateUserResourceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CircleDollarSign className="mr-2 h-4 w-4" />
                    Purchase Storage
                </Button>
            </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>Review your past and outstanding invoices. {isFetchingPayments && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}</CardDescription>
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
                          <TableCell className="font-medium">#{payment.documentId || payment.id || 'N/A'}</TableCell>
                          <TableCell>
                            {formatDate(payment.Billing_From)} - {formatDate(payment.Billing_To)}
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
                              <Tooltip><TooltipTrigger asChild><Button disabled={true} variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDownloadInvoice(payment.documentId || payment.id)}><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Download Invoice</TooltipContent></Tooltip>
                              {payment.Payment_Status === 'Unpaid' && (
                                <Tooltip><TooltipTrigger asChild><Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => handlePayNow(payment.documentId || payment.id)}><CreditCard className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Pay Now</TooltipContent></Tooltip>
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
             {isLoadingCardDetails && (
                 <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                 </div>
             )}
             {!isLoadingCardDetails && cardDetails && cardDetails.length > 0 && (
                <div className="space-y-4 mb-6">
                    <h3 className="text-md font-medium">Saved Cards</h3>
                    {cardDetails.map(card => (
                        <Card key={card.documentId || card.id} className="p-4 flex justify-between items-center bg-muted/30">
                            <div>
                                <p className="font-semibold">{card.card_holder_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Card: •••• •••• •••• {card.card_number?.slice(-4)}
                                </p>
                                <p className="text-xs text-muted-foreground">Expires: {card.Expiry_Date}</p>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteCard(card.documentId)}
                                        disabled={deleteCardDetailMutation.isPending} // Placeholder
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Card (Placeholder)</TooltipContent>
                            </Tooltip>
                        </Card>
                    ))}
                </div>
             )}
             {!isLoadingCardDetails && (!cardDetails || cardDetails.length === 0) && (
                <div className="mb-6 p-4 border border-dashed rounded-md text-center text-muted-foreground">
                     <Info className="mx-auto h-8 w-8 mb-2" />
                    No saved payment methods found.
                </div>
             )}
             <Separator className="my-6"/>
             <h3 className="text-lg font-medium mb-4">Add New Card</h3>
            <Form {...cardForm}>
              <form onSubmit={cardForm.handleSubmit(onSaveCardSubmit)} className="space-y-4">
                <FormField control={cardForm.control} name="card_holder_name" render={({ field }) => (
                  <FormItem><FormLabel>Cardholder Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} disabled={createCardDetailMutation.isPending} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={cardForm.control} name="card_number" render={({ field }) => (
                  <FormItem><FormLabel>Card Number</FormLabel><FormControl><Input placeholder="•••• •••• •••• ••••" {...field} disabled={createCardDetailMutation.isPending} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={cardForm.control} name="Expiry_Date" render={({ field }) => (
                    <FormItem><FormLabel>Expiry Date (MM/YY)</FormLabel><FormControl><Input placeholder="MM/YY" {...field} disabled={createCardDetailMutation.isPending} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={cardForm.control} name="cvv" render={({ field }) => (
                    <FormItem><FormLabel>CVV</FormLabel><FormControl><Input placeholder="•••" {...field} type="password" disabled={createCardDetailMutation.isPending} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={createCardDetailMutation.isPending}>
                  {createCardDetailMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  Invoice #{selectedPaymentForDetails.documentId || selectedPaymentForDetails.id} | Period: {formatDate(selectedPaymentForDetails.Billing_From)} - {formatDate(selectedPaymentForDetails.Billing_To)}
                </DialogDescriptionComponent>
              </DialogHeader>
              <ScrollArea className="flex-1 my-2">
                <div className="p-4 space-y-4 border rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                            <h3 className="font-semibold">Your Company Name</h3>
                            <p>123 Business Rd, Suite 456</p>
                            <p>Anytown, ST 12345</p>
                            <p>GSTIN: YOUR_GSTIN_HERE</p>
                        </div>
                        <div className="text-right">
                            <p><span className="font-semibold">Invoice Date:</span> {formatDate(selectedPaymentForDetails.createdAt)}</p>
                            <p><span className="font-semibold">Due Date:</span> {formatDate(selectedPaymentForDetails.Last_date_of_payment)}</p>
                        </div>
                    </div>
                     <Separator />
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm my-4">
                        <div>
                            <h4 className="font-semibold mb-1">Billed To</h4>
                            <p>{selectedPaymentForDetails.user?.username || 'N/A'}</p>
                            <p>{selectedPaymentForDetails.user?.email || 'N/A'}</p>
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
                  <Table className="my-4 text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[35%]">Item/Description</TableHead>
                        <TableHead className="text-center">HSN/SAC</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Rate (₹)</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Taxable Value (₹)</TableHead>
                        <TableHead className="text-center">CGST</TableHead>
                        <TableHead className="text-center">SGST</TableHead>
                        <TableHead className="text-right">Total (₹)</TableHead>
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
                          const { sgstAmount, cgstAmount } = calculateItemTaxes(item, taxableValue);
                          const itemTotal = taxableValue + sgstAmount + cgstAmount;

                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">{item.Particulars || 'N/A'}</div>
                                {item.Description && <div className="text-muted-foreground text-xs">{item.Description}</div>}
                              </TableCell>
                              <TableCell className="text-center">{item.HSN || '-'}</TableCell>
                              <TableCell className="text-center">{quantity}</TableCell>
                              <TableCell className="text-right">{price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{discountPercent > 0 ? `${discountAmount.toFixed(2)} (${discountPercent}%)` : '-'}</TableCell>
                              <TableCell className="text-right">{taxableValue.toFixed(2)}</TableCell>
                              <TableCell className="text-center">{item.CGST || 0}%<br/>(₹{cgstAmount.toFixed(2)})</TableCell>
                              <TableCell className="text-center">{item.SGST || 0}%<br/>(₹{sgstAmount.toFixed(2)})</TableCell>
                              <TableCell className="text-right font-semibold">{itemTotal.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow><TableCell colSpan={9} className="text-center h-24">No item details.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                    <div className="flex justify-end mt-4">
                        <div className="w-full max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between"><span>Subtotal:</span><span>₹{
                                (selectedPaymentForDetails.Items || []).reduce((sum, item) => sum + calculateItemTaxableValue(item), 0).toFixed(2)
                            }</span></div>
                            <div className="flex justify-between"><span>Total CGST:</span><span>₹{
                                (selectedPaymentForDetails.Items || []).reduce((sum, item) => sum + calculateItemTaxes(item, calculateItemTaxableValue(item)).cgstAmount, 0).toFixed(2)
                            }</span></div>
                            <div className="flex justify-between"><span>Total SGST:</span><span>₹{
                                (selectedPaymentForDetails.Items || []).reduce((sum, item) => sum + calculateItemTaxes(item, calculateItemTaxableValue(item)).sgstAmount, 0).toFixed(2)
                            }</span></div>
                            <Separator />
                            <div className="flex justify-between font-semibold text-base"><span>Invoice Total:</span><span>₹{calculateOverallTotal(selectedPaymentForDetails.Items).toFixed(2)}</span></div>
                        </div>
                    </div>
                     <Separator className="my-4" />
                    <div className="text-xs space-y-1">
                        <p className="font-semibold">Terms & Conditions:</p>
                        <p>1. Please pay within 15 days of the invoice date.</p>
                        <p>2. Interest @ 18% p.a. will be charged on overdue bills.</p>
                    </div>
                    <div className="text-xs text-muted-foreground text-center mt-6 border-t pt-3">
                        Thank you for your business! | This is a computer-generated invoice.
                    </div>
                </div>
              </ScrollArea>
              <DialogFooter className="border-t pt-4">
                <Button disabled onClick={() => alert("Print action triggered for invoice: " + (selectedPaymentForDetails?.documentId || selectedPaymentForDetails?.id))}>Print Invoice</Button>
                <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}
