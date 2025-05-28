
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BillingLoadingSkeleton() {
  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-1/3" />
      </div>

      {/* Subscription Overview Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Skeleton className="h-4 w-1/3 mb-1" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div>
            <Skeleton className="h-4 w-1/3 mb-1" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </CardContent>
      </Card>

      {/* Invoice History Table Skeleton */}
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
                  <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-5 w-24" /></TableHead>
                  <TableHead className="text-center"><Skeleton className="h-5 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-28" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-5 w-32" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
       {/* Payment Methods Skeleton */}
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3 mt-1" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-4 w-1/2" />
            </CardContent>
        </Card>
    </div>
  );
}

    