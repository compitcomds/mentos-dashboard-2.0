
"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription as AlertDescriptionComponent,
  AlertTitle,
} from "@/components/ui/alert"; 
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetQueryForms,
  type UseGetQueryFormsOptions,
} from "@/lib/queries/query-form";
import type { QueryForm } from "@/types/query-form";
import type { Media } from "@/types/media";
import {
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
  Eye,
  FileText,
  ImageIcon as ImageIconLucide,
  Video,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Paperclip,
  Code2,
  User,
  CalendarIcon,
  DownloadCloud,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStoredPreference, setStoredPreference } from "@/lib/storage";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from "@/hooks/use-toast";

type ViewModeQuery = "card" | "table";
type SortFieldQuery = "name" | "email" | "type" | "group_id" | "createdAt";
type SortOrderQuery = "asc" | "desc";

const DEFAULT_PAGE_SIZE_QUERY_TABLE = 10;
const DEFAULT_PAGE_SIZE_QUERY_CARD = 9;
const QUERY_FORM_TYPES_FILTER = ["contact", "career", "event", "membership"];

const PAGE_SIZE_OPTIONS_QUERY = [
  { label: "9 per page (Card)", value: "9" }, { label: "10 per page (Table)", value: "10" },
  { label: "12 per page", value: "12" }, { label: "20 per page", value: "20" },
  { label: "24 per page", value: "24" }, { label: "50 per page", value: "50" },
];
const SORT_FIELD_OPTIONS_QUERY: { label: string; value: SortFieldQuery }[] = [
  { label: "Name", value: "name" }, { label: "Email", value: "email" },
  { label: "Type", value: "type" }, { label: "Group ID", value: "group_id" },
  { label: "Submitted At", value: "createdAt" },
];
const SORT_ORDER_OPTIONS_QUERY: { label: string; value: SortOrderQuery }[] = [
  { label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" },
];

const formatBytes = (bytes?: number | null, decimals = 2) => {
  if (bytes === null || bytes === undefined || bytes <= 0) return "0 Bytes";
  const k = 1024; 
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["KB", "MB", "GB", "TB"]; 
  const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const MediaPreview: React.FC<{ mediaItem: Media }> = ({ mediaItem }) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || "";
  const getFullUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith("http")
      ? url
      : `${apiBaseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const mainUrl = getFullUrl(mediaItem.url);
  const thumbUrl = getFullUrl(mediaItem.formats?.thumbnail?.url) || mainUrl;

  if (!thumbUrl && !mainUrl) {
    return (
      <div className="text-xs text-muted-foreground p-1 flex items-center justify-center bg-muted rounded h-16 w-16">
        <FileText className="w-6 h-6" />
      </div>
    );
  }
  const displaySrc = thumbUrl || mainUrl;

  if (mediaItem.mime?.startsWith("image/") && displaySrc) {
    return (
      <img
        src={displaySrc}
        alt={mediaItem.alternativeText || mediaItem.name || "media"}
        className="w-16 h-16 object-cover rounded border"
      />
    );
  }
  if (mediaItem.mime?.startsWith("video/") && displaySrc) {
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border">
        <Video className="w-8 h-8 text-purple-500" />
      </div>
    );
  }
  if (mediaItem.mime === "application/pdf" && displaySrc) {
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border">
        <FileText className="w-8 h-8 text-red-500" />
      </div>
    );
  }
  return (
    <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border">
      <FileText className="w-8 h-8 text-gray-500" />
    </div>
  );
};

const QueryFormCard: React.FC<{
  queryForm: QueryForm;
  onViewDetails: (queryForm: QueryForm) => void;
}> = ({ queryForm, onViewDetails }) => {
  return (
    <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg truncate" title={queryForm.name || "N/A"}>
          {queryForm.name || "N/A"}
        </CardTitle>
        <CardDescription
          className="text-xs truncate"
          title={queryForm.email || "N/A"}
        >
          {queryForm.email || "N/A"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        <p className="text-muted-foreground line-clamp-2 mb-1">
          {queryForm.description || "No description."}
        </p>
        {queryForm.type && (
          <Badge variant="outline" className="mr-1 capitalize">
            {queryForm.type}
          </Badge>
        )}
        {queryForm.group_id && (
          <Badge variant="secondary">Group: {queryForm.group_id}</Badge>
        )}
        {queryForm.createdAt && (
          <p className="text-xs text-muted-foreground pt-1">
            Submitted: {format(parseISO(String(queryForm.createdAt)), "PPP")}
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(queryForm)}
          className="w-full"
        >
          <Eye className="mr-2 h-4 w-4" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

const QueryFormTable: React.FC<{
  queryForms: QueryForm[];
  onViewDetails: (queryForm: QueryForm) => void;
}> = ({ queryForms, onViewDetails }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead className="hidden md:table-cell">Group ID</TableHead>
          <TableHead className="hidden lg:table-cell">Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queryForms.map((form) => (
          <TableRow key={form.documentId || form.id}>
            <TableCell className="font-medium">{form.name || "N/A"}</TableCell>
            <TableCell>{form.email || "N/A"}</TableCell>
            <TableCell className="hidden sm:table-cell capitalize">
              {form.type || "-"}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {form.group_id || "-"}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">
              {form.createdAt ? (
                <Tooltip>
                  <TooltipTrigger>
                    {format(parseISO(String(form.createdAt)), "dd MMM yyyy")}
                  </TooltipTrigger>
                  <TooltipContent>
                    {format(parseISO(String(form.createdAt)), "PPP p")}
                  </TooltipContent>
                </Tooltip>
              ) : (
                "N/A"
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewDetails(form)}
                className="h-8 w-8"
              >
                <Eye className="h-4 w-4" />
                <span className="sr-only">View Details</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default function QueryFormsPage() {
  const [viewMode, setViewMode] = React.useState<ViewModeQuery>(() =>
    getStoredPreference("queryFormViewMode", "card")
  );
  const [selectedQueryForm, setSelectedQueryForm] =
    React.useState<QueryForm | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(() =>
    getStoredPreference(
      "queryFormPageSize",
      viewMode === "table"
        ? DEFAULT_PAGE_SIZE_QUERY_TABLE
        : DEFAULT_PAGE_SIZE_QUERY_CARD
    )
  );
  const [sortField, setSortField] = React.useState<SortFieldQuery>(() =>
    getStoredPreference("queryFormSortField", "createdAt")
  );
  const [sortOrder, setSortOrder] = React.useState<SortOrderQuery>(() =>
    getStoredPreference("queryFormSortOrder", "desc")
  );

  const [selectedTypeFilter, setSelectedTypeFilter] = React.useState<
    string | null
  >(() => getStoredPreference("queryFormTypeFilter", null));
  const [localGroupIdFilter, setLocalGroupIdFilter] = React.useState("");
  const [activeGroupIdFilter, setActiveGroupIdFilter] = React.useState<
    string | null
  >(() => getStoredPreference("queryFormGroupIdFilter", null));


  // State for CSV Download Dialog
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [downloadGroupId, setDownloadGroupId] = React.useState(activeGroupIdFilter || "");
  const [downloadDateFrom, setDownloadDateFrom] = React.useState<Date | undefined>();
  const [downloadDateTo, setDownloadDateTo] = React.useState<Date | undefined>();
  const [isDownloadingCsv, setIsDownloadingCsv] = React.useState(false);


  const queryFormOptions: UseGetQueryFormsOptions = {
    page: currentPage,
    pageSize,
    sortField,
    sortOrder,
    type: selectedTypeFilter,
    group_id: activeGroupIdFilter,
  };
  const {
    data: queryFormsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetQueryForms(queryFormOptions);

  const queryForms = queryFormsData?.data || [];
  const pagination = queryFormsData?.meta?.pagination;

  React.useEffect(() => {
    setStoredPreference("queryFormViewMode", viewMode);
  }, [viewMode]);
  React.useEffect(() => {
    setStoredPreference("queryFormPageSize", pageSize);
    setCurrentPage(1);
  }, [pageSize]);
  React.useEffect(() => {
    setStoredPreference("queryFormSortField", sortField);
    setCurrentPage(1);
  }, [sortField]);
  React.useEffect(() => {
    setStoredPreference("queryFormSortOrder", sortOrder);
    setCurrentPage(1);
  }, [sortOrder]);
  React.useEffect(() => {
    setStoredPreference("queryFormTypeFilter", selectedTypeFilter);
    setCurrentPage(1);
  }, [selectedTypeFilter]);
  React.useEffect(() => {
    setStoredPreference("queryFormGroupIdFilter", activeGroupIdFilter);
    setCurrentPage(1);
    // Pre-fill download group ID when active filter changes
    if (activeGroupIdFilter) setDownloadGroupId(activeGroupIdFilter);
  }, [activeGroupIdFilter]);

  const handleViewDetails = (queryForm: QueryForm) => {
    setSelectedQueryForm(queryForm);
    setIsDetailDialogOpen(true);
  };

  const applyGroupIdFilter = () => {
    setActiveGroupIdFilter(
      localGroupIdFilter.trim() === "" ? null : localGroupIdFilter.trim()
    );
  };

  // Function to escape CSV cell content
  const escapeCsvCell = (cellData: any): string => {
    if (cellData === null || cellData === undefined) return "";
    const stringVal = String(cellData);
    // If the string contains a comma, double quote, or newline, wrap it in double quotes
    // and escape any existing double quotes by doubling them up.
    if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n")) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };

  const handleDownloadCsv = async () => {
    if (!downloadGroupId.trim()) {
      toast({ title: "Group ID Required", description: "Please enter a Group ID to download.", variant: "destructive" });
      return;
    }
    setIsDownloadingCsv(true);
    try {
      // Fetch all data for the given group ID and date range
      // Using a very large page size to attempt to get all records.
      // For truly large datasets, server-side CSV generation or iterative fetching would be better.
      const fetchAllParams: UseGetQueryFormsOptions = {
        group_id: downloadGroupId.trim(),
        dateFrom: downloadDateFrom,
        dateTo: downloadDateTo,
        pageSize: 1000, // Fetch up to 1000 records, adjust if needed
        page: 1,
        sortField: 'createdAt', // Or a more relevant sort for export
        sortOrder: 'asc',
      };
      // Directly use the service function with specific parameters for download
      const { getQueryForms: getQueryFormsService } = await import('@/lib/services/query-form');
      const { data: currentUser } = await import('@/lib/queries/user').then(m => m.useCurrentUser()); // Get current user for tenent_id

      if (!currentUser?.tenent_id) {
          toast({ title: "Error", description: "User information not available for download.", variant: "destructive" });
          setIsDownloadingCsv(false);
          return;
      }

      const response = await getQueryFormsService({
        ...fetchAllParams,
        userTenentId: currentUser.tenent_id
      });
      const dataToExport = response.data;

      if (!dataToExport || dataToExport.length === 0) {
        toast({ title: "No Data", description: "No query forms found for the selected Group ID and date range.", variant: "default" });
        setIsDownloadingCsv(false);
        return;
      }

      // Dynamically determine headers from other_meta
      const otherMetaKeys = new Set<string>();
      dataToExport.forEach(item => {
        if (item.other_meta && typeof item.other_meta === 'object') {
          Object.keys(item.other_meta).forEach(key => otherMetaKeys.add(key));
        }
      });
      const sortedOtherMetaKeys = Array.from(otherMetaKeys).sort();

      const headers = [
        "ID", "Document ID", "Name", "Email", "Description", "Type", "Group ID",
        "Submitted At", "Published At", "Media Count", "Media Filenames", "Media Total Size (KB)",
        ...sortedOtherMetaKeys
      ];

      const csvRows = [headers.join(",")];

      dataToExport.forEach(item => {
        const mediaCount = item.media?.length || 0;
        const mediaFilenames = item.media?.map(m => m.name || 'unnamed_file').join('; ') || "";
        const mediaTotalSizeKb = item.media_size_Kb || 0;

        const row = [
          escapeCsvCell(item.id),
          escapeCsvCell(item.documentId),
          escapeCsvCell(item.name),
          escapeCsvCell(item.email),
          escapeCsvCell(item.description),
          escapeCsvCell(item.type),
          escapeCsvCell(item.group_id),
          escapeCsvCell(item.createdAt ? format(parseISO(String(item.createdAt)), "yyyy-MM-dd HH:mm:ss") : ""),
          escapeCsvCell(item.publishedAt ? format(parseISO(String(item.publishedAt)), "yyyy-MM-dd HH:mm:ss") : ""),
          escapeCsvCell(mediaCount),
          escapeCsvCell(mediaFilenames),
          escapeCsvCell(mediaTotalSizeKb),
        ];

        sortedOtherMetaKeys.forEach(key => {
          const value = item.other_meta && typeof item.other_meta === 'object' ? (item.other_meta as Record<string, any>)[key] : "";
          row.push(escapeCsvCell(typeof value === 'object' ? JSON.stringify(value) : value));
        });
        csvRows.push(row.join(","));
      });

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `query_forms_${downloadGroupId}_${format(new Date(), "yyyyMMddHHmmss")}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast({ title: "Download Started", description: "CSV file is being generated."});
      setIsDownloadDialogOpen(false); // Close dialog on successful download trigger
    } catch (err) {
      console.error("Error downloading CSV:", err);
      toast({ title: "Download Failed", description: (err as Error).message || "Could not generate CSV.", variant: "destructive" });
    } finally {
      setIsDownloadingCsv(false);
    }
  };


  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Query Forms</h1>
          <div className="flex items-center space-x-2 self-end sm:self-center">
             <Button onClick={() => setIsDownloadDialogOpen(true)} variant="outline" size="sm" disabled={isLoading || isFetching}>
                <DownloadCloud className="mr-2 h-4 w-4" /> Download CSV
             </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("card")}
                  aria-label="Card View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Card View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  aria-label="Table View"
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Table View</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filter Query Forms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <Label
                  htmlFor="type-filter-select"
                  className="text-xs text-muted-foreground"
                >
                  Filter by Type
                </Label>
                <Select
                  value={selectedTypeFilter || "all"}
                  onValueChange={(value) =>
                    setSelectedTypeFilter(value === "all" ? null : value)
                  }
                  disabled={isLoading || isFetching}
                >
                  <SelectTrigger
                    id="type-filter-select"
                    className="h-9 text-xs"
                  >
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {["all", ...QUERY_FORM_TYPES_FILTER].map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="text-xs capitalize"
                      >
                        {type === "all" ? "All Types" : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative md:col-span-1">
                <Label
                  htmlFor="group-id-filter-input"
                  className="text-xs text-muted-foreground"
                >
                  Filter by Group ID
                </Label>
                <Input
                  id="group-id-filter-input"
                  type="search"
                  placeholder="Group ID..."
                  value={localGroupIdFilter}
                  onChange={(e) => setLocalGroupIdFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyGroupIdFilter()}
                  className="h-9 text-xs"
                  disabled={isLoading || isFetching}
                />
              </div>
              <Button
                onClick={applyGroupIdFilter}
                className="w-full md:w-auto h-9 text-xs"
                disabled={isLoading || isFetching}
              >
                <Search className="h-3.5 w-3.5 mr-1.5" /> Apply Group ID Filter
              </Button>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced-sort-pagination">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Advanced Sorting & Pagination
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Sort By
                      </Label>
                      <Select
                        value={sortField}
                        onValueChange={(value) =>
                          setSortField(value as SortFieldQuery)
                        }
                        disabled={isLoading || isFetching}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_FIELD_OPTIONS_QUERY.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-xs"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Order
                      </Label>
                      <Select
                        value={sortOrder}
                        onValueChange={(value) =>
                          setSortOrder(value as SortOrderQuery)
                        }
                        disabled={isLoading || isFetching}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Order..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_ORDER_OPTIONS_QUERY.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-xs"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Items/Page
                      </Label>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => setPageSize(Number(value))}
                        disabled={isLoading || isFetching}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Items per page" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS_QUERY.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-xs"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {(isLoading && !queryFormsData) || (isFetching && !queryFormsData) ? (
          <QueryFormsPageSkeleton viewMode={viewMode} pageSize={pageSize} />
        ) : null}

        {isError && !isFetching && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescriptionComponent>
              Could not fetch query forms. {error?.message}
              <Button
                onClick={() => refetch()}
                variant="secondary"
                size="sm"
                className="ml-2 mt-2"
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Retry
              </Button>
            </AlertDescriptionComponent>
          </Alert>
        )}

        {!isLoading && !isError && queryForms.length === 0 && (
          <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
            No query forms found matching your criteria.
          </div>
        )}

        {!isLoading && !isError && queryForms.length > 0 && (
          <>
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {queryForms.map((form) => (
                  <QueryFormCard
                    key={form.documentId || form.id}
                    queryForm={form}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Submitted Queries</CardTitle>
                  <CardDescription>
                    Review submitted forms.
                    {isFetching && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <QueryFormTable
                    queryForms={queryForms}
                    onViewDetails={handleViewDetails}
                  />
                </CardContent>
              </Card>
            )}

            {pagination && pagination.pageCount > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1 || isFetching}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pageCount} (Total:{" "}
                  {pagination.total} forms)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(pagination.pageCount, prev + 1)
                    )
                  }
                  disabled={currentPage === pagination.pageCount || isFetching}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CSV Download Dialog */}
       <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Query Forms CSV</DialogTitle>
            <DialogDescription>Specify Group ID and date range for the export.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="download-group-id">Group ID <span className="text-destructive">*</span></Label>
              <Input
                id="download-group-id"
                value={downloadGroupId}
                onChange={(e) => setDownloadGroupId(e.target.value)}
                placeholder="Enter Group ID"
                disabled={isDownloadingCsv}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="download-date-from">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="download-date-from"
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal h-9", !downloadDateFrom && "text-muted-foreground")}
                      disabled={isDownloadingCsv}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {downloadDateFrom ? format(downloadDateFrom, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={downloadDateFrom} onSelect={setDownloadDateFrom} initialFocus disabled={isDownloadingCsv}/>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="download-date-to">To Date</Label>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="download-date-to"
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal h-9", !downloadDateTo && "text-muted-foreground")}
                      disabled={isDownloadingCsv}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {downloadDateTo ? format(downloadDateTo, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={downloadDateTo} onSelect={setDownloadDateTo} initialFocus disabled={isDownloadingCsv}/>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isDownloadingCsv}>Cancel</Button></DialogClose>
            <Button onClick={handleDownloadCsv} disabled={isDownloadingCsv || !downloadGroupId.trim()}>
              {isDownloadingCsv && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {selectedQueryForm && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:min-w-[90%] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Query Details: {selectedQueryForm.name || "N/A"}
              </DialogTitle>
              <DialogDescription>
                From: {selectedQueryForm.email || "N/A"}
              </DialogDescription>
            </DialogHeader>
             <ScrollArea className="flex-1 min-h-0"> {/* Added min-h-0 for ScrollArea to work correctly in flex */}
              <div className="py-4 space-y-3 text-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2 bg-muted/50 p-4 rounded-lg border">
                  <DetailItem label="Name" value={selectedQueryForm.name} />
                  <DetailItem label="Email" value={selectedQueryForm.email} />
                  <DetailItem label="Description" value={selectedQueryForm.description} preWrap/>
                  <DetailItem label="Type" value={selectedQueryForm.type} badge capitalize/>
                  <DetailItem label="Group ID" value={selectedQueryForm.group_id} badge="secondary"/>
                  <DetailItem label="User Key (Tenent ID)" value={selectedQueryForm.tenent_id} />
                  <DetailItem label="Submitted At" value={selectedQueryForm.createdAt ? format(parseISO(String(selectedQueryForm.createdAt)), "PPP p") : undefined}/>
                  <DetailItem label="Published At" value={selectedQueryForm.publishedAt ? format(parseISO(String(selectedQueryForm.publishedAt)), "PPP p") : undefined}/>
                </div>

                <div className="md:col-span-2 space-y-4">
                 {selectedQueryForm.media && selectedQueryForm.media.length > 0 && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-primary"/> Attached Media
                                {selectedQueryForm.media_size_Kb ? (
                                  <Badge variant="outline" className="ml-auto text-xs font-normal">
                                    Total Size: {formatBytes(selectedQueryForm.media_size_Kb)}
                                  </Badge>
                                ) : null}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {selectedQueryForm.media.map((mediaItem) => (
                                <a
                                  key={mediaItem.id}
                                  href={mediaItem.url ? (mediaItem.url.startsWith('http') ? mediaItem.url : `${process.env.NEXT_PUBLIC_API_BASE_URL_no_api || ''}${mediaItem.url}`) : '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block border rounded-lg p-2 hover:shadow-lg transition-shadow text-center group"
                                >
                                  <MediaPreview mediaItem={mediaItem} />
                                  <p className="text-xs truncate mt-1.5 group-hover:text-primary" title={mediaItem.name}>{mediaItem.name}</p>
                                </a>
                              ))}
                            </div>
                        </CardContent>
                    </Card>
                  )}

                  {selectedQueryForm.other_meta && Object.keys(selectedQueryForm.other_meta).length > 0 && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Code2 className="h-4 w-4 text-primary"/> Other Metadata (JSON)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <pre className="text-xs bg-muted p-3 rounded-md border w-full overflow-auto max-h-60">
                              {(() => {
                                try {
                                  const jsonData = typeof selectedQueryForm.other_meta === 'string'
                                    ? JSON.parse(selectedQueryForm.other_meta)
                                    : selectedQueryForm.other_meta;
                                  return JSON.stringify(jsonData, null, 2);
                                } catch (e) {
                                  return String(selectedQueryForm.other_meta); // Show as string if parsing fails
                                }
                              })()}
                            </pre>
                        </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-auto pt-4 border-t flex-shrink-0">
              <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}

const DetailItem: React.FC<{
  label: string;
  value?: string | number | null;
  preWrap?: boolean;
  badge?: true | "outline" | "secondary";
  capitalize?: boolean;
}> = ({ label, value, preWrap = false, badge, capitalize }) => {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  return (
    <div className="grid grid-cols-3 gap-2 items-start py-1.5 border-b border-border/60 last:border-b-0">
      <strong className="col-span-1 text-muted-foreground font-medium text-xs sm:text-sm">
        {label}:
      </strong>
      <div
        className={`col-span-2 ${
          preWrap ? "whitespace-pre-wrap break-words" : "truncate"
        } text-xs sm:text-sm`}
      >
        {badge ? (
          <Badge
            variant={badge === true ? "default" : badge}
            className={capitalize ? "capitalize" : ""}
          >
            {String(value)}
          </Badge>
        ) : (
          String(value)
        )}
      </div>
    </div>
  );
};

function QueryFormsPageSkeleton({
  viewMode,
  pageSize,
}: {
  viewMode: ViewModeQuery;
  pageSize: number;
}) {
  const skeletonItemsCount = pageSize;
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>
      {viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(skeletonItemsCount)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(6)].map((_, i) => (
                      <TableHead key={i}>
                        <Skeleton className="h-5 w-full" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(skeletonItemsCount)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-8 w-20" />
      </div>
    </>
  );
}

