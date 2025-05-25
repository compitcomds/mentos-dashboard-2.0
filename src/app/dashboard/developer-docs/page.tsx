
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Code } from 'lucide-react';

export default function DeveloperDocsPage() {
  return (
    <div className="flex flex-col space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-6 w-6" />
            Developer API Documentation
          </CardTitle>
          <CardDescription>
            Overview of key API endpoints for managing content and data.
            Remember to include your authentication token (Bearer token) in the Authorization header for all requests.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extra Content Management API</CardTitle>
          <CardDescription>
            Endpoints for managing Extra Content Formats (Meta Formats) and their associated Data Entries (Meta Datas).
            All endpoints are prefixed with your API base URL (e.g., `/api`).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-2">1. Meta Formats (Form Definitions)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              These endpoints manage the structure and definition of your dynamic forms.
              Filtering by `tenent_id` is automatically handled by backend policies for authenticated users.
            </p>
            <div className="space-y-2">
              <div>
                <h4 className="font-medium">List Meta Formats</h4>
                <p className="text-xs text-muted-foreground">Retrieve all meta formats accessible to the authenticated user (based on their `tenent_id`).</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>GET /api/meta-formats</code>
                  <br />
                  <code>{`// Example Query Params (Optional, Strapi defaults apply):`}</code>
                  <br />
                  <code>{`// ?populate=*`}</code>
                  <br />
                  <code>{`// ?filters[tenent_id][$eq]=YOUR_TENENT_ID (Implicitly handled by backend policies)`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-medium">Get a Specific Meta Format</h4>
                <p className="text-xs text-muted-foreground">Retrieve a single meta format by its string `documentId`.</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>GET /api/meta-formats/:documentId</code>
                  <br />
                  <code>{`// Example: GET /api/meta-formats/your-meta-format-document-id`}</code>
                  <br />
                  <code>{`// ?populate=* (Highly recommended to get 'from_formate' components)`}</code>
                </pre>
              </div>
              {/* Add POST, PUT, DELETE for meta-formats if they are managed via API */}
              {/* For now, assuming meta-formats are primarily defined in Strapi admin */}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2 mt-4">2. Meta Datas (Form Data Entries)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              These endpoints manage the actual data entries submitted through the dynamic forms.
              Filtering by `tenent_id` and `meta_format` is crucial.
            </p>
            <div className="space-y-2">
              <div>
                <h4 className="font-medium">List Meta Data Entries for a Specific Format</h4>
                <p className="text-xs text-muted-foreground">
                  Retrieve data entries for a specific Meta Format, filtered by the user's `tenent_id`.
                </p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>GET /api/meta-datas</code>
                  <br />
                  <code>{`// Required Query Params:`}</code>
                  <br />
                  <code>{`// ?filters[meta_format][documentId][$eq]=:metaFormatDocumentId`}</code>
                  <br />
                  <code>{`// ?filters[tenent_id][$eq]=:your_tenent_id (Implicitly handled by backend policies)`}</code>
                  <br />
                  <code>{`// Optional Query Params:`}</code>
                  <br />
                  <code>{`// ?populate=meta_format,user`}</code>
                  <br />
                  <code>{`// ?sort[0]=createdAt:desc`}</code>
                  <br />
                  <code>{`// Example: GET /api/meta-datas?filters[meta_format][documentId][$eq]=some-format-doc-id`}</code>
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
    "tenent_id": "YOUR_TENENT_ID",
    "meta_format": "META_FORMAT_DOCUMENT_ID", // String documentId of the MetaFormat
    "user": USER_ID, // Numeric ID of the user
    "meta_data": {
      "your_field_label_slug": "value",
      "another_field": 123,
      "media_field_slug": "MEDIA_FILE_DOCUMENT_ID_OR_ARRAY_OF_THEM" 
    },
    "publishedAt": "YYYY-MM-DDTHH:mm:ss.sssZ" // Or null for draft
  }
}`}</code>
                </pre>
              </div>
               <div>
                <h4 className="font-medium">Get a Specific Meta Data Entry</h4>
                <p className="text-xs text-muted-foreground">Retrieve a single data entry by its string `documentId`.</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>GET /api/meta-datas/:documentId</code>
                  <br />
                  <code>{`// Example: GET /api/meta-datas/your-meta-data-document-id`}</code>
                  <br />
                  <code>{`// ?populate=meta_format,user`}</code>
                </pre>
              </div>
              <div>
                <h4 className="font-medium">Update a Meta Data Entry</h4>
                <p className="text-xs text-muted-foreground">Update an existing data entry by its string `documentId`.</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>PUT /api/meta-datas/:documentId</code>
                  <br />
                  <code>{`// Example: PUT /api/meta-datas/your-meta-data-document-id`}</code>
                  <br />
                  <code>{`// Request Body Example (only fields to update):`}</code>
                  <br />
                  <code>{`
{
  "data": {
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
                <p className="text-xs text-muted-foreground">Delete a data entry by its string `documentId`.</p>
                <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  <code>DELETE /api/meta-datas/:documentId</code>
                  <br />
                  <code>{`// Example: DELETE /api/meta-datas/your-meta-data-document-id`}</code>
                </pre>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
