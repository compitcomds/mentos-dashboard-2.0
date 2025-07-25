"use client";

import * as React from "react";
import {
  useParams,
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";
import { useGetMetaFormat } from "@/lib/queries/meta-format";
import {
  useGetMetaDataEntries,
  useDeleteMetaDataEntry,
  type UseGetMetaDataEntriesOptions,
} from "@/lib/queries/meta-data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogDescription as AlertDialogDescriptionComponent,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDesc, // Renamed to avoid conflict with AlertDescription
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  FileJson as FileJsonIcon,
  Loader2,
  PackageOpen,
  Eye,
  ImageIcon,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import type { MetaData } from "@/types/meta-data";
import type { FormFormatComponent } from "@/types/meta-format";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { getStoredPreference, setStoredPreference } from "@/lib/storage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import MediaRenderer from "../_components/media-renderer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const getFieldName = (component: FormFormatComponent): string => {
  if (component.label && component.label.trim() !== "") {
    const slugifiedLabel = component.label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    return slugifiedLabel;
  }
  return `component_${component.__component.replace(
    "dynamic-component.",
    ""
  )}_${component.id}`;
};

const formatDate = (
  dateString?: string | Date,
  formatType: string = "PPP p"
) => {
  if (!dateString) return "N/A";
  const date =
    typeof dateString === "string" ? parseISO(dateString) : dateString;
  return isValid(date) ? format(date, formatType) : "Invalid Date";
};

type SortFieldMetaData = "handle" | "createdAt" | "updatedAt" | "publishedAt";
type SortOrderMetaData = "asc" | "desc";

const DEFAULT_PAGE_SIZE_METADATA = 9;
const DEFAULT_SORT_FIELD: SortFieldMetaData = "createdAt";
const DEFAULT_SORT_ORDER: SortOrderMetaData = "desc";

const PAGE_SIZE_OPTIONS_METADATA = [
  { label: "9 per page", value: "9" },
  { label: "12 per page", value: "12" },
  { label: "24 per page", value: "24" },
  { label: "48 per page", value: "48" },
];
const SORT_FIELD_OPTIONS_METADATA: {
  label: string;
  value: SortFieldMetaData;
}[] = [
  { label: "Handle", value: "handle" },
  { label: "Created At", value: "createdAt" },
  { label: "Updated At", value: "updatedAt" },
  { label: "Published At", value: "publishedAt" },
];
const SORT_ORDER_OPTIONS_METADATA: {
  label: string;
  value: SortOrderMetaData;
}[] = [
  { label: "Ascending", value: "asc" },
  { label: "Descending", value: "desc" },
];

const getPaginationItems = (
  currentPage: number,
  totalPages: number,
  maxPagesToShow: number = 5
): (number | string)[] => {
  if (totalPages <= 1) return [];

  const items: (number | string)[] = [];
  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
    return items;
  }

  items.push(1);
  let startPage = Math.max(
    2,
    currentPage - Math.floor((maxPagesToShow - 3) / 2)
  );
  let endPage = Math.min(
    totalPages - 1,
    currentPage + Math.floor((maxPagesToShow - 2) / 2)
  );

  if (currentPage - 1 <= Math.floor((maxPagesToShow - 3) / 2)) {
    endPage = maxPagesToShow - 2;
  }
  if (totalPages - currentPage <= Math.floor((maxPagesToShow - 2) / 2)) {
    startPage = totalPages - (maxPagesToShow - 3);
  }

  if (startPage > 2) {
    items.push("...");
  }

  for (let i = startPage; i <= endPage; i++) {
    items.push(i);
  }

  if (endPage < totalPages - 1) {
    items.push("...");
  }

  items.push(totalPages);
  return items;
};

const EntryCarousel: React.FC<{ entry: MetaData; entryMediaIds: number[] }> = ({
  entry,
  entryMediaIds,
}) => {
  const [carouselApi, setCarouselApi] = React.useState<
    CarouselApi | undefined
  >();
  const [loadedSlides, setLoadedSlides] = React.useState<Set<number>>(
    new Set()
  );

  React.useEffect(() => {
    if (!carouselApi) return;

    const loadCurrentAndAdjacent = (api: CarouselApi) => {
      if (!api) return;
      const selectedSnap = api.selectedScrollSnap();
      const newLoaded = new Set(loadedSlides);
      newLoaded.add(selectedSnap);
      // Optionally preload adjacent slides
      if (api.canScrollPrev()) newLoaded.add(selectedSnap - 1);
      if (api.canScrollNext()) newLoaded.add(selectedSnap + 1);
      setLoadedSlides(newLoaded);
    };

    loadCurrentAndAdjacent(carouselApi); // Load initial and adjacent
    carouselApi.on("select", loadCurrentAndAdjacent);
    carouselApi.on("resize", () => loadCurrentAndAdjacent(carouselApi)); // Also load on resize

    return () => {
      if (carouselApi && typeof carouselApi.off === "function") {
        carouselApi.off("select", loadCurrentAndAdjacent);
        carouselApi.off("resize", () => loadCurrentAndAdjacent(carouselApi));
      }
    };
  }, [carouselApi]); // Only re-run if carouselApi changes

  // Initialize first slide as loaded
  React.useEffect(() => {
    setLoadedSlides(new Set([0]));
  }, []);

  if (entryMediaIds.length === 0) return null;

  return (
    <div className="bg-muted border-b">
      {entryMediaIds.length === 1 &&
      entryMediaIds[0] !== null &&
      !isNaN(entryMediaIds[0]) ? (
        <MediaRenderer
          mediaId={entryMediaIds[0]}
          className="w-full h-48 object-cover"
        />
      ) : entryMediaIds.length > 1 ? (
        <Carousel
          className="w-full"
          opts={{ loop: entryMediaIds.length > 1 }}
          setApi={setCarouselApi}
        >
          <CarouselContent>
            {entryMediaIds.map(
              (mediaId, index) =>
                mediaId !== null &&
                !isNaN(mediaId) && (
                  <CarouselItem
                    key={`${entry.documentId || entry.id}-media-${index}`}
                  >
                    <div className="p-0 aspect-video flex items-center justify-center bg-muted/30">
                      {loadedSlides.has(index) ? (
                        <MediaRenderer
                          mediaId={mediaId}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                )
            )}
          </CarouselContent>
          {entryMediaIds.length > 1 && (
            <CarouselPrevious className="left-2 disabled:opacity-30 bg-background/50 hover:bg-background/80" />
          )}
          {entryMediaIds.length > 1 && (
            <CarouselNext className="right-2 disabled:opacity-30 bg-background/50 hover:bg-background/80" />
          )}
        </Carousel>
      ) : null}
    </div>
  );
};

export default function MetaDataListingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const metaFormatDocumentId = params.metaFormatDocumentId as string;

  // --- State derived from URL ---
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentLimit = parseInt(
    searchParams.get("limit") ||
      String(
        getStoredPreference("metaDataPageSize", DEFAULT_PAGE_SIZE_METADATA)
      ),
    10
  );
  const currentSortBy =
    (searchParams.get("sortBy") as SortFieldMetaData | null) ||
    getStoredPreference("metaDataSortField", DEFAULT_SORT_FIELD);
  const currentOrder =
    (searchParams.get("order") as SortOrderMetaData | null) ||
    getStoredPreference("metaDataSortOrder", DEFAULT_SORT_ORDER);
  const currentHandleFilter = searchParams.get("handle") || "";

  const [localHandleFilter, setLocalHandleFilter] =
    React.useState(currentHandleFilter);

  // Update local filter when URL filter changes (e.g., back button)
  React.useEffect(() => {
    setLocalHandleFilter(searchParams.get("handle") || "");
  }, [searchParams]);

  const {
    data: metaFormat,
    isLoading: isLoadingMetaFormat,
    isError: isErrorMetaFormat,
    error: errorMetaFormat,
  } = useGetMetaFormat(metaFormatDocumentId);

  const metaDataQueryOptions: UseGetMetaDataEntriesOptions = {
    page: currentPage,
    pageSize: currentLimit,
    sortField: currentSortBy,
    sortOrder: currentOrder,
    handleFilter: currentHandleFilter || null,
  };

  const {
    data: metaDataResponse,
    isLoading: isLoadingMetaData,
    isError: isErrorMetaData,
    error: errorMetaData,
    refetch: refetchMetaData,
    isFetching: isFetchingMetaData,
  } = useGetMetaDataEntries(metaFormatDocumentId, metaDataQueryOptions);
  const metaDataEntries = metaDataResponse?.data || [];
  const paginationInfo = metaDataResponse?.meta?.pagination;

  const deleteMetaDataMutation = useDeleteMetaDataEntry();

  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [metaDataToDelete, setMetaDataToDelete] =
    React.useState<MetaData | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);
  const [selectedEntryData, setSelectedEntryData] = React.useState<Record<
    string,
    any
  > | null>(null);
  const [selectedEntryForDialog, setSelectedEntryForDialog] =
    React.useState<MetaData | null>(null);

  const updateUrl = React.useCallback(
    (newParams: Record<string, string | number | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      let resetPageTo1 = false;

      Object.entries(newParams).forEach(([key, value]) => {
        const stringValue =
          value === null || value === undefined ? null : String(value);
        const oldValue = current.get(key);

        if (stringValue === null || stringValue === "") {
          current.delete(key);
        } else {
          current.set(key, stringValue);
        }
        // If a filter or sort param changes, we usually want to go back to page 1
        if (key !== "page" && oldValue !== stringValue && key !== "limit") {
          resetPageTo1 = true;
        }
      });

      if (resetPageTo1 && !newParams.hasOwnProperty("page")) {
        current.delete("page");
      } else if (newParams.page === 1 || newParams.page === "1") {
        current.delete("page");
      }

      router.push(`${pathname}?${current.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (paginationInfo?.pageCount || 1)) {
      updateUrl({ page: newPage });
    }
  };

  const handlePageSizeChange = (value: string) => {
    setStoredPreference("metaDataPageSize", Number(value));
    updateUrl({ limit: value, page: null });
  };

  const handleSortFieldChange = (value: SortFieldMetaData) => {
    setStoredPreference("metaDataSortField", value);
    updateUrl({ sortBy: value, page: null });
  };

  const handleSortOrderChange = (value: SortOrderMetaData) => {
    setStoredPreference("metaDataSortOrder", value);
    updateUrl({ order: value, page: null });
  };

  const applyHandleFilter = () => {
    updateUrl({ handle: localHandleFilter.trim() || null, page: null });
  };

  const handleDeleteConfirmation = (entry: MetaData) => {
    setMetaDataToDelete(entry);
    setIsAlertOpen(true);
  };

  const executeDelete = () => {
    if (metaDataToDelete?.documentId) {
      deleteMetaDataMutation.mutate(
        {
          documentId: metaDataToDelete.documentId,
          metaFormatDocumentId: metaFormatDocumentId,
        },
        {
          onSuccess: () => {
            setIsAlertOpen(false);
            setMetaDataToDelete(null);
            // No need to refetchMetaData() here as query invalidation in useDeleteMetaDataEntry handles it
            if (metaDataEntries.length === 1 && currentPage > 1) {
              updateUrl({ page: currentPage - 1 }); // This will trigger a refetch for the new page
            } else {
              // If not going to a new page, the invalidation from the hook is enough
              // queryClient.invalidateQueries(META_DATA_ENTRIES_QUERY_KEY(...))
            }
          },
          onError: () => setIsAlertOpen(false), // Error toast handled by hook
        }
      );
    }
  };

  const handleViewData = (entry: MetaData) => {
    setSelectedEntryData(entry.meta_data || {});
    setSelectedEntryForDialog(entry);
    setIsDetailDialogOpen(true);
  };

  const isLoading = isLoadingMetaFormat || isLoadingMetaData;
  const isError = isErrorMetaFormat || isErrorMetaData;
  const error = errorMetaFormat || errorMetaData;

  if (isLoading && !metaDataResponse && !isErrorMetaFormat) {
    return <MetaDataPageSkeleton />;
  }

  if (isError && !isFetchingMetaData) {
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/extra-content")}
        >
          &larr; Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || "Could not load data."}
          </AlertDescription>
          <Button
            onClick={() => refetchMetaData()}
            className="mt-2"
            disabled={isFetchingMetaData}
          >
            {isFetchingMetaData && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}{" "}
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (!metaFormat && !isLoadingMetaFormat) {
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/extra-content")}
        >
          &larr; Back
        </Button>
        <Alert>
          <AlertTitle>Extra Content Format Not Found</AlertTitle>
          <AlertDescription>
            ID: {metaFormatDocumentId} not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentUrlForReturn = `${pathname}?${searchParams.toString()}`;
  const createNewEntryLink = `/dashboard/extra-content/render/${metaFormatDocumentId}?action=create&returnUrl=${encodeURIComponent(
    currentUrlForReturn
  )}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button
        variant="outline"
        onClick={() => router.push("/dashboard/extra-content")}
      >
        &larr; Back to Extra Content Management
      </Button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            {metaFormat?.name || <Skeleton className="h-8 w-48 inline-block" />}
          </h1>
          {metaFormat?.description && (
            <p className="text-muted-foreground mt-1">
              {metaFormat.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Format ID: {metaFormatDocumentId}
          </p>
        </div>
        <Button asChild className="flex-shrink-0">
          <Link href={createNewEntryLink}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Entry
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filter & Sort Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="relative md:col-span-2">
              <Label
                htmlFor="handle-filter-input"
                className="text-xs text-muted-foreground"
              >
                Filter by Handle
              </Label>
              <Input
                id="handle-filter-input"
                type="search"
                placeholder="Enter handle to search..."
                value={localHandleFilter}
                onChange={(e) => setLocalHandleFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyHandleFilter()}
                className="h-9 text-xs mt-1"
                disabled={isLoadingMetaData || isFetchingMetaData}
              />
            </div>
            <Button
              onClick={applyHandleFilter}
              className="w-full md:w-auto h-9 text-xs"
              disabled={isLoadingMetaData || isFetchingMetaData}
            >
              <Search className="h-3.5 w-3.5 mr-1.5" /> Apply Handle Filter
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
                      value={currentSortBy}
                      onValueChange={handleSortFieldChange}
                      disabled={isLoadingMetaData || isFetchingMetaData}
                    >
                      <SelectTrigger className="h-9 text-xs mt-1">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_FIELD_OPTIONS_METADATA.map((opt) => (
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
                      value={currentOrder}
                      onValueChange={handleSortOrderChange}
                      disabled={isLoadingMetaData || isFetchingMetaData}
                    >
                      <SelectTrigger className="h-9 text-xs mt-1">
                        <SelectValue placeholder="Order..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_ORDER_OPTIONS_METADATA.map((opt) => (
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
                      value={String(currentLimit)}
                      onValueChange={handlePageSizeChange}
                      disabled={isLoadingMetaData || isFetchingMetaData}
                    >
                      <SelectTrigger className="h-9 text-xs mt-1">
                        <SelectValue placeholder="Items per page" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS_METADATA.map((opt) => (
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

      {isFetchingMetaData && metaDataEntries.length === 0 && (
        <MetaDataPageSkeleton />
      )}

      {(!metaDataEntries || metaDataEntries.length === 0) &&
        !isFetchingMetaData &&
        !isLoading && (
          <Card className="col-span-full text-center py-12 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center">
              <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground">
                No Data Entries Found
              </h3>
              <p className="text-muted-foreground mt-1">
                {currentHandleFilter
                  ? `No entries match handle filter "${currentHandleFilter}".`
                  : `No entries for "${metaFormat?.name}".`}
              </p>
            </CardContent>
          </Card>
        )}

      {metaDataEntries && metaDataEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metaDataEntries.map((entry) => {
            const entryMediaIds: number[] = [];
            const otherFields: { label: string | null; value: any }[] = [];

            if (metaFormat?.from_formate && entry.meta_data) {
              metaFormat.from_formate.forEach((component) => {
                const fieldName = getFieldName(component);
                const value = entry.meta_data?.[fieldName];

                if (
                  component.__component === "dynamic-component.media-field" &&
                  value !== null &&
                  value !== undefined
                ) {
                  const idsToCollect: (number | string)[] =
                    component.is_array && Array.isArray(value)
                      ? value
                      : [value];
                  idsToCollect.forEach((mediaIdValue) => {
                    const numericMediaId =
                      typeof mediaIdValue === "number"
                        ? mediaIdValue
                        : typeof mediaIdValue === "string" &&
                          !isNaN(parseInt(mediaIdValue, 10))
                        ? parseInt(mediaIdValue, 10)
                        : null;
                    if (numericMediaId !== null && !isNaN(numericMediaId)) {
                      entryMediaIds.push(numericMediaId);
                    }
                  });
                } else if (
                  value !== null &&
                  value !== undefined &&
                  (typeof value !== "string" || String(value).trim() !== "")
                ) {
                  let displayValue: any = value;
                  if (
                    typeof value === "object" &&
                    !Array.isArray(value) &&
                    value !== null
                  )
                    displayValue = "[Object]";
                  else if (
                    Array.isArray(value) &&
                    component.__component !== "dynamic-component.media-field"
                  )
                    displayValue = value.join(", ");
                  else if (typeof value === "boolean")
                    displayValue = value ? "Yes" : "No";
                  else if (
                    component.__component === "dynamic-component.date-field" &&
                    value
                  ) {
                    try {
                      const parsedDate = parseISO(String(value));
                      if (isValid(parsedDate)) {
                        displayValue = formatDate(
                          parsedDate,
                          component.type === "time"
                            ? "p"
                            : component.type === "data&time" ||
                              component.type === "datetime"
                            ? "Pp"
                            : "PP"
                        );
                      } else {
                        displayValue = String(value);
                      }
                    } catch {
                      displayValue = String(value);
                    }
                  }

                  if (
                    typeof displayValue === "string" &&
                    displayValue.length > 60 &&
                    !(
                      component.__component ===
                        "dynamic-component.text-field" &&
                      component.inputType === "tip-tap"
                    )
                  ) {
                    displayValue = `${displayValue.substring(0, 57)}...`;
                  }
                  if (
                    component.__component !== "dynamic-component.media-field"
                  ) {
                    otherFields.push({
                      label: component.label ?? null,
                      value: displayValue,
                    });
                  }
                }
              });
            }
            const editEntryPathWithReturn = `/dashboard/extra-content/render/${metaFormatDocumentId}?action=edit&entry=${
              entry.documentId
            }&returnUrl=${encodeURIComponent(currentUrlForReturn)}`;

            return (
              <Card
                key={entry.documentId || entry.id}
                className="flex flex-col shadow-md hover:shadow-lg transition-shadow rounded-lg overflow-hidden"
              >
                <EntryCarousel entry={entry} entryMediaIds={entryMediaIds} />
                <CardHeader
                  className={cn(
                    entryMediaIds.length > 0 ? "pt-4 pb-2" : "pb-2"
                  )}
                >
                  <CardTitle className="text-base font-semibold text-foreground">
                    {entry.handle ||
                      `Data Entry ID: ${entry.documentId || "N/A"}`}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {entry.handle && `ID: ${entry.documentId || "N/A"} | `}
                    Created:{" "}
                    {entry.createdAt
                      ? formatDate(entry.createdAt, "MMM d, yyyy, HH:mm")
                      : "N/A"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 pt-0 text-sm">
                  {otherFields.length > 0 ? (
                    <div className="space-y-1">
                      {otherFields.slice(0, 3).map((field, index) => (
                        <p
                          key={index}
                          className="text-muted-foreground truncate"
                        >
                          <span className="font-medium text-foreground">
                            {field.label || "Field"}:
                          </span>{" "}
                          {String(field.value)}
                        </p>
                      ))}
                      {otherFields.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          ...and {otherFields.length - 3} more fields.
                        </p>
                      )}
                    </div>
                  ) : (
                    entryMediaIds.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No displayable text data.
                      </p>
                    )
                  )}
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-3 bg-muted/30 p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <MoreHorizontal className="h-4 w-4" />{" "}
                        <span className="ml-1 sr-only md:not-sr-only">
                          Actions
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => router.push(editEntryPathWithReturn)}
                        disabled={!entry.documentId}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleViewData(entry)}
                        disabled={!entry.meta_data}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View Data
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={() => handleDeleteConfirmation(entry)}
                        disabled={
                          !entry.documentId ||
                          (deleteMetaDataMutation.isPending &&
                            metaDataToDelete?.documentId === entry.documentId)
                        }
                      >
                        {deleteMetaDataMutation.isPending &&
                        metaDataToDelete?.documentId === entry.documentId ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {paginationInfo && paginationInfo.pageCount > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isFetchingMetaData}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>

          <div className="flex items-center gap-1">
            {getPaginationItems(currentPage, paginationInfo.pageCount).map(
              (item, index) =>
                typeof item === "number" ? (
                  <Button
                    key={`page-${item}-${index}`}
                    variant={currentPage === item ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => handlePageChange(item)}
                    disabled={isFetchingMetaData}
                  >
                    {item}
                  </Button>
                ) : (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1.5 py-1 text-xs flex items-center justify-center h-8 w-8"
                  >
                    ...
                  </span>
                )
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={
              currentPage === paginationInfo.pageCount || isFetchingMetaData
            }
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitleComponent>Are you sure?</AlertDialogTitleComponent>
            <AlertDialogDescriptionComponent>
              This action cannot be undone. This will permanently delete the
              data entry with handle
              <span className="font-semibold">
                {" "}
                "
                {metaDataToDelete?.handle ||
                  metaDataToDelete?.documentId ||
                  "this entry"}
                "
              </span>
              .
            </AlertDialogDescriptionComponent>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMetaDataMutation.isPending}
              onClick={() => setMetaDataToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleteMetaDataMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMetaDataMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Details for Entry (Handle:{" "}
              {selectedEntryForDialog?.handle ||
                selectedEntryForDialog?.documentId ||
                "N/A"}
              )
            </DialogTitle>
            <DialogDesc>
              {" "}
              {/* Changed to DialogDesc */}
              View formatted data or raw JSON.
            </DialogDesc>
          </DialogHeader>
          <Tabs
            defaultValue="ui"
            className="flex-1 flex flex-col overflow-hidden mt-2"
          >
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="ui">Formatted View</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 mt-2 border rounded-md">
              <TabsContent value="ui" className="p-4 space-y-3 text-sm">
                {selectedEntryData && metaFormat?.from_formate ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 items-start py-1 border-b">
                      <strong className="col-span-1 break-words">
                        Handle:
                      </strong>
                      <div className="col-span-2 break-words font-mono text-xs bg-muted px-1 py-0.5 rounded">
                        {selectedEntryForDialog?.handle || "N/A"}
                      </div>
                    </div>
                    {metaFormat.from_formate.map((component) => {
                      const fieldName = getFieldName(component);
                      let value = selectedEntryData[fieldName];
                      let isHtmlContent = false;

                      // Check for TipTap content
                      if (
                        component.__component ===
                          "dynamic-component.text-field" &&
                        component.inputType === "tip-tap"
                      ) {
                        isHtmlContent =
                          typeof value === "string" &&
                          value.startsWith("<") &&
                          value.endsWith(">");
                      }

                      if (
                        value === undefined ||
                        value === null ||
                        (typeof value === "string" &&
                          value.trim() === "" &&
                          !isHtmlContent)
                      ) {
                        return (
                          <div
                            key={component.id}
                            className="grid grid-cols-3 gap-2 items-start py-1 border-b"
                          >
                            <strong className="col-span-1 break-words text-muted-foreground/70">
                              {component.label || fieldName}:
                            </strong>
                            <div className="col-span-2 break-words text-muted-foreground/70 italic">
                              Not set
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={component.id}
                          className="grid grid-cols-3 gap-2 items-start py-2 border-b last:border-b-0"
                        >
                          <strong className="col-span-1 break-words">
                            {component.label || fieldName}:
                          </strong>
                          <div className="col-span-2 break-words">
                            {component.__component ===
                            "dynamic-component.media-field" ? (
                              Array.isArray(value) ? (
                                <div className="flex flex-wrap gap-2">
                                  {value.map(
                                    (mediaId: string | number, idx: number) =>
                                      typeof mediaId === "number" ? (
                                        <MediaRenderer
                                          key={idx}
                                          mediaId={mediaId}
                                          className="w-24 h-24 object-contain border rounded"
                                        />
                                      ) : (
                                        <code
                                          className="text-xs bg-muted px-1 py-0.5 rounded"
                                          key={idx}
                                        >
                                          Invalid ID: {String(mediaId)}
                                        </code>
                                      )
                                  )}
                                </div>
                              ) : typeof value === "number" ? (
                                <MediaRenderer
                                  mediaId={value}
                                  className="max-w-xs max-h-48 object-contain border rounded"
                                />
                              ) : (
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  Invalid ID: {String(value)}
                                </code>
                              )
                            ) : component.__component ===
                              "dynamic-component.date-field" ? (
                              Array.isArray(value) ? (
                                value
                                  .map((v: any) => {
                                    try {
                                      return isValid(parseISO(String(v)))
                                        ? format(
                                            parseISO(String(v)),
                                            component.type === "time"
                                              ? "p"
                                              : component.type ===
                                                  "data&time" ||
                                                component.type === "datetime"
                                              ? "Pp"
                                              : "PP"
                                          )
                                        : String(v);
                                    } catch {
                                      return String(v);
                                    }
                                  })
                                  .join(", ")
                              ) : isValid(parseISO(String(value))) ? (
                                format(
                                  parseISO(String(value)),
                                  component.type === "time"
                                    ? "p"
                                    : component.type === "data&time" ||
                                      component.type === "datetime"
                                    ? "Pp"
                                    : "PP"
                                )
                              ) : (
                                String(value)
                              )
                            ) : typeof value === "boolean" ? (
                              value ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  No
                                </span>
                              )
                            ) : Array.isArray(value) ? (
                              value.map((item, i) => (
                                <code
                                  key={i}
                                  className="text-xs bg-muted px-1 py-0.5 rounded mr-1 mb-1 inline-block"
                                >
                                  {String(item)}
                                </code>
                              ))
                            ) : isHtmlContent ? (
                              <div
                                className="prose prose-sm dark:prose-invert max-w-none border rounded p-2 bg-background"
                                dangerouslySetInnerHTML={{ __html: value }}
                              />
                            ) : (
                              String(value)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p>No data to display or format definition missing.</p>
                )}
              </TabsContent>
              <TabsContent value="raw" className="p-0">
                <ScrollArea className="h-full">
                  <pre className="p-4 text-xs whitespace-pre-wrap break-all bg-muted rounded-b-md h-full">
                    {selectedEntryData
                      ? JSON.stringify(selectedEntryData, null, 2)
                      : "No JSON data available."}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          <DialogFooter className="mt-4 flex-shrink-0 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaDataPageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-1/4" /> {/* Back button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64 mb-1" /> {/* Title */}
          <Skeleton className="h-4 w-80 mb-1" /> {/* Description */}
          <Skeleton className="h-3 w-40" /> {/* Format ID */}
        </div>
        <Skeleton className="h-10 w-40" /> {/* Create New Entry Button */}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2 space-y-1">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-full md:w-auto" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />{" "}
          {/* Accordion Trigger */}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={`skeleton-entry-${i}`} className="flex flex-col shadow-sm">
            <Skeleton className="aspect-video bg-muted rounded-t-lg" />
            <CardHeader className="pb-2 pt-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
            <CardContent className="space-y-2 flex-1 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
            <CardFooter className="border-t pt-3 flex justify-end">
              <Skeleton className="h-8 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
