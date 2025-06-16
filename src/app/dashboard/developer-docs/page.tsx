
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Code, BookOpen, Workflow, FileText, Edit, ListFilter, Search, SortAsc, CornerDownRight, Newspaper, CalendarDays, Package } from 'lucide-react';

export default function DeveloperDocsPage() {
  return (
    <div className="flex flex-col space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Developer API Documentation
          </CardTitle>
          <CardDescription>
            Overview of key API endpoints for managing content and data.
            Remember to include your authentication token (Bearer token) in the Authorization header for all requests.
            Data is typically scoped by your <code className="font-mono text-sm bg-muted px-1 py-0.5 rounded">tenent_id</code> based on your authentication.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Meta Formats and Meta Datas (Extra Content) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Extra Content Management API
          </CardTitle>
          <CardDescription>
            Endpoints for managing Extra Content Formats (Meta Formats) and their associated Data Entries (Meta Datas).
            All endpoints are prefixed with your API base URL (e.g., <code className="font-mono text-sm bg-muted px-1 py-0.5 rounded">/api</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              1. Meta Formats (Dynamic Form Definitions)
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              These endpoints manage the structure and definition of your dynamic forms.
            </p>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">List Meta Formats</h4>
                <p className="text-xs text-muted-foreground">Retrieve all meta formats accessible to your <code className="font-mono text-xs bg-muted px-0.5 rounded">tenent_id</code>.</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>GET /api/meta-formats</code>
                  <br />
                  <code>{`// Recommended: Populate components for form rendering`}</code>
                  <br />
                  <code>{`// ?populate=user,from_formate,from_formate.Values,from_formate.media`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-medium">Get a Specific Meta Format</h4>
                <p className="text-xs text-muted-foreground">Retrieve a single meta format by its string <code className="font-mono text-xs bg-muted px-0.5 rounded">documentId</code>.</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>GET /api/meta-formats/:documentId</code>
                  <br />
                  <code>{`// Example: GET /api/meta-formats/your-meta-format-document-id`}</code>
                  <br />
                  <code>{`// Recommended: Populate components for form rendering`}</code>
                  <br />
                  <code>{`// ?populate=user,from_formate,from_formate.Values,from_formate.media`}</code>
                </pre>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2 mt-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              2. Meta Datas (Form Data Entries)
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              These endpoints manage the actual data entries submitted through the dynamic forms.
            </p>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">List Meta Data Entries for a Specific Format</h4>
                <p className="text-xs text-muted-foreground">
                  Retrieve data entries for a specific Meta Format.
                </p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>GET /api/meta-datas</code>
                  <br />
                  <code>{`// Required Query Params:`}</code>
                  <br />
                  <code>{`// ?filters[meta_format][documentId][$eq]=:metaFormatDocumentId`}</code>
                  <br />
                  <code>{`// (Implicitly filtered by your tenent_id)`}</code>
                  <br />
                  <code>{`// Optional Query Params:`}</code>
                  <br />
                  <code>{`// Search by handle (case-insensitive, partial match):`}</code>
                  <br />
                  <code>{`// ?filters[handle][$containsi]=my-entry`}</code>
                  <br />
                  <code>{`// Sorting (e.g., by creation date descending):`}</code>
                  <br />
                  <code>{`// ?sort[0]=createdAt:desc`}</code>
                  <br />
                  <code>{`// Pagination:`}</code>
                  <br />
                  <code>{`// ?pagination[page]=1&pagination[pageSize]=10`}</code>
                  <br />
                  <code>{`// Populate relations:`}</code>
                  <br />
                  <code>{`// ?populate=meta_format,user`}</code>
                  <br />
                  <code>{`// Example: GET /api/meta-datas?filters[meta_format][documentId][$eq]=some-format-doc-id&sort[0]=handle:asc&populate=user`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-medium">Get a Specific Meta Data Entry</h4>
                <p className="text-xs text-muted-foreground">Retrieve a single data entry by its string <code className="font-mono text-xs bg-muted px-0.5 rounded">documentId</code> using filters.</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>GET /api/meta-datas</code>
                  <br />
                  <code>{`// Required Query Params:`}</code>
                  <br />
                  <code>{`// ?filters[documentId][$eq]=:yourMetaDataDocumentId`}</code>
                  <br />
                  <code>{`// (Implicitly filtered by your tenent_id)`}</code>
                  <br />
                  <code>{`// Optional Query Params:`}</code>
                  <br />
                  <code>{`// ?populate=meta_format,user`}</code>
                  <br />
                  <code>{`// Example: GET /api/meta-datas?filters[documentId][$eq]=your-entry-doc-id&populate=meta_format`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-medium">Create a New Meta Data Entry</h4>
                <p className="text-xs text-muted-foreground">Submit data for a specific Meta Format.</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>POST /api/meta-datas</code>
                  <br />
                  <code>{`// Request Body Example:`}</code>
                  <br />
                  <code>{`
{
  "data": {
    "tenent_id": "YOUR_TENENT_ID", // Automatically set if user is authenticated
    "meta_format": "META_FORMAT_DOCUMENT_ID_OR_NUMERIC_ID", // String documentId or numeric ID of the MetaFormat
    "user": USER_ID, // Numeric ID of the user
    "handle": "unique-entry-handle", // Required unique handle
    "meta_data": {
      "your_field_label_slug": "value",
      "another_field": 123,
      "media_field_slug": MEDIA_FILE_NUMERIC_ID_OR_ARRAY_OF_THEM
    },
    "publishedAt": "YYYY-MM-DDTHH:mm:ss.sssZ" // Or null for draft
  }
}`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-medium">Update a Meta Data Entry</h4>
                <p className="text-xs text-muted-foreground">Update an existing data entry by its string <code className="font-mono text-xs bg-muted px-0.5 rounded">documentId</code> (or numeric <code className="font-mono text-xs bg-muted px-0.5 rounded">id</code> if your service is adapted).</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>PUT /api/meta-datas/:entryNumericId</code>
                  <br />
                  <code>{`// Note: The path parameter should be the NUMERIC id. The service layer currently handles resolving documentId to numeric id.`}</code>
                  <br />
                  <code>{`// Request Body Example (only fields to update):`}</code>
                  <br />
                  <code>{`
{
  "data": {
    "handle": "new-unique-handle",
    "meta_data": {
      "your_field_label_slug": "new value"
    },
    "publishedAt": null // To unpublish
  }
}`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-medium">Delete a Meta Data Entry</h4>
                <p className="text-xs text-muted-foreground">Delete a data entry by its string <code className="font-mono text-xs bg-muted px-0.5 rounded">documentId</code> (or numeric <code className="font-mono text-xs bg-muted px-0.5 rounded">id</code>).</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>DELETE /api/meta-datas/:entryDocumentIdOrNumericId</code>
                  <br />
                  <code>{`// Example: DELETE /api/meta-datas/your-meta-data-document-id`}</code>
                  <br />
                  <code>{`// Note: Service layer will handle if documentId or numeric ID is used based on its implementation.`}</code>
                </pre>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Blog API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Blog API
          </CardTitle>
          <CardDescription>
            Endpoints for managing Blog posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <ListFilter className="h-5 w-5" />
              List Blog Posts
            </h3>
            <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
              <code>GET /api/blogs</code>
              <br />
              <code>{`// (Implicitly filtered by your tenent_id)`}</code>
              <br />
              <code>{`// Query Parameters Examples:`}</code>
              <br />
              <code>{`// ?filters[title][$containsi]=NextJS`}</code>
              <br />
              <code>{`// ?filters[categories][documentId][$eq]=technology-category-doc-id`}</code>
              <br />
              <code>{`// ?filters[tags][tag_value][$in][0]=react&filters[tags][tag_value][$in][1]=typescript`}</code>
              <br />
              <code>{`// ?filters[author][$containsi]=John Doe`}</code>
              <br />
              <code>{`// ?sort[0]=publishedAt:desc&sort[1]=title:asc`}</code>
              <br />
              <code>{`// ?pagination[page]=1&pagination[pageSize]=10`}</code>
              <br />
              <code>{`// ?populate=image,categories,tags,seo_blog.metaImage,seo_blog.openGraph.ogImage`}</code>
            </pre>
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-2 mt-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Get a Single Blog Post
            </h3>
            <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
              <code>GET /api/blogs/:documentId</code>
              <br />
              <code>{`// Path Parameter: :documentId (string)`}</code>
              <br />
              <code>{`// (Implicitly filtered by your tenent_id)`}</code>
              <br />
              <code>{`// Query Parameters Example:`}</code>
              <br />
              <code>{`// ?populate=image,categories,tags,seo_blog.metaImage,seo_blog.openGraph.ogImage,user`}</code>
            </pre>
          </section>
          {/* Add POST, PUT, DELETE for blogs similarly if needed, referencing the types/services */}
        </CardContent>
      </Card>

      {/* Event API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Event API
          </CardTitle>
          <CardDescription>
            Endpoints for managing Events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <ListFilter className="h-5 w-5" />
              List Events
            </h3>
            <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
              <code>GET /api/events</code>
              <br />
              <code>{`// (Implicitly filtered by your tenent_id)`}</code>
              <br />
              <code>{`// Query Parameters Examples:`}</code>
              <br />
              <code>{`// ?filters[title][$containsi]=Workshop`}</code>
              <br />
              <code>{`// ?filters[category][$eq]=Technology`}</code>
              <br />
              <code>{`// ?filters[event_status][$eq]=Published`}</code>
              <br />
              <code>{`// ?sort[0]=event_date_time:asc`}</code>
              <br />
              <code>{`// ?pagination[page]=1&pagination[pageSize]=5`}</code>
              <br />
              <code>{`// ?populate=poster,speakers.image,tags`}</code>
            </pre>
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-2 mt-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Get a Single Event
            </h3>
            <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
              <code>GET /api/events/:documentId</code>
              <br />
              <code>{`// Path Parameter: :documentId (string)`}</code>
              <br />
              <code>{`// (Implicitly filtered by your tenent_id)`}</code>
              <br />
              <code>{`// Query Parameters Example:`}</code>
              <br />
              <code>{`// ?populate=poster,speakers.image,tags,user`}</code>
            </pre>
          </section>
           {/* Add POST, PUT, DELETE for events similarly if needed */}
        </CardContent>
      </Card>

    </div>
  );
}
