"use server";

import type { Blog, CreateBlogPayload } from "@/types/blog";
import type { FindMany, FindOne } from "@/types/strapi_response"; // Import Strapi response types
import axiosInstance from "@/lib/axios";
import { getAccessToken } from "@/lib/actions/auth";
import { AxiosError } from "axios";

// Helper to get Authorization header
async function getAuthHeader() {
  const token = await getAccessToken();
  console.log(`[getAuthHeader] Blog Token: ${token ? "Exists" : "Not Found"}`);
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return { Authorization: `Bearer ${token}` };
}

// Get all blogs for a specific user tenent_id
export const getBlogs = async (userTenentId: string): Promise<Blog[]> => {
  if (!userTenentId) {
    console.error("[Service getBlogs]: userTenentId is missing.");
    throw new Error("User tenent_id is required to fetch blogs.");
  }
  const params = {
    "filters[tenent_id][$eq]": userTenentId,
  };
  const url = "/blogs";
  console.log(`[getBlogs] Fetching URL: ${url} with params:`, params);

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindMany<Blog>>(url, {
      params,
      headers,
    });
    console.log(`[getBlogs] Response Data:`, response.data.data);
    if (
      !response.data ||
      !response.data.data ||
      !Array.isArray(response.data.data)
    ) {
      console.error(
        `[getBlogs] Unexpected API response structure for tenent_id ${userTenentId}. Expected 'data' array, received:`,
        response.data
      );
      if (
        response.data === null ||
        response.data === undefined ||
        (response.data && !response.data.data)
      ) {
        // Check if response.data.data is missing
        console.warn(
          `[getBlogs] API returned null, undefined, or no 'data' property for tenent_id ${userTenentId}. Returning empty array.`
        );
        return [];
      }
      throw new Error(
        'Unexpected API response structure. Expected an array within a "data" property.'
      );
    }
    console.log(
      `[getBlogs] Fetched ${response.data.data.length} Blogs for tenent_id ${userTenentId}.`
    );
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to fetch blogs for tenent_id ${userTenentId}`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data || { message: error.message };
      console.error(
        `[getBlogs] Failed to fetch blogs from ${url} (${status}) for tenent_id ${userTenentId}:`,
        errorData
      );
      message =
        (errorData as any)?.error?.message ||
        `Failed to fetch blogs (${status}) - ${
          (errorData as any).message || "Unknown API error"
        }`;
    } else if (error instanceof Error) {
      console.error(
        `[getBlogs] Generic Error for tenent_id ${userTenentId}:`,
        error.message
      );
      message = error.message;
    } else {
      console.error(
        `[getBlogs] Unknown Error for tenent_id ${userTenentId}:`,
        error
      );
    }
    throw new Error(message);
  }
};

// Get a specific blog by its string documentId, ensuring it matches the userTenentId after fetch
export const getBlog = async (
  documentId: string,
  userTenentId: string
): Promise<Blog | null> => {
  if (!documentId) {
    console.warn(`[Service getBlog]: documentId is missing.`);
    return null;
  }
  if (!userTenentId) {
    console.error(
      `[Service getBlog]: userTenentId is missing for blog documentId ${documentId}.`
    );
    throw new Error("User tenent_id is required to verify fetched blog.");
  }
  const params = {
    "populate[seo_blog][populate][openGraph][populate]": "ogImage",
    "populate[tags]": "true",
    "populate[image]": "true",
    "populate[categories]": "true",
    "populate[seo_blog][populate]": "metaImage",
  };
  const url = `/blogs/${documentId}`; // Use string documentId for this GET request path
  console.log(
    `[getBlog] Fetching URL: ${url} (using string documentId) with params:`,
    params
  );

  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get<FindOne<Blog>>(url, {
      params,
      headers,
    });

    if (
      !response.data ||
      !response.data.data ||
      typeof response.data.data !== "object" ||
      response.data.data === null
    ) {
      console.error(
        `[getBlog] Unexpected API response structure for blog ${documentId} from ${url}. Expected 'data' object, received:`,
        response.data
      );
      return null;
    }

    if (response.data.data.tenent_id !== userTenentId) {
      console.warn(
        `[getBlog] Fetched blog ${documentId} tenent_id (${response.data.data.tenent_id}) does not match requested userTenentId (${userTenentId}). Access denied or wrong item.`
      );
      return null;
    }

    console.log(
      `[getBlog] Fetched Blog ${documentId} Data for tenent_id ${userTenentId}:`,
      response.data.data
    );
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to fetch blog ${documentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data || { message: error.message };
      if (status === 404) {
        console.warn(`[getBlog] Blog ${documentId} not found.`);
        return null;
      }
      if (status === 403) {
        console.warn(`[getBlog] Access to blog ${documentId} forbidden.`);
        return null;
      }
      console.error(
        `[getBlog] Failed to fetch blog ${documentId} from ${url} (Status: ${status}):`,
        JSON.stringify(errorData, null, 2)
      );
      const strapiErrorMessage = (errorData as any)?.error?.message;
      message =
        strapiErrorMessage ||
        `Failed to fetch blog ${documentId} (${status}) - ${
          (errorData as any).message || "Unknown API error"
        }`;
    } else if (error instanceof Error) {
      console.error(
        `[getBlog] Generic Error for blog ${documentId}:`,
        error.message
      );
      message = error.message;
    } else {
      console.error(`[getBlog] Unknown Error for blog ${documentId}:`, error);
    }
    throw new Error(message);
  }
};

// Create a blog, ensuring the userTenentId is included in the payload
export const createBlog = async (blog: CreateBlogPayload): Promise<Blog> => {
  if (!blog.tenent_id) {
    console.error("[Service createBlog]: tenent_id is missing in payload.");
    throw new Error(
      "User tenent_id is required in the payload to create a blog."
    );
  }
  const userTenentId = blog.tenent_id;
  const url = "/blogs";
  const params = { populate: "*" };
  console.log(
    `[createBlog] Creating blog at ${url} with tenent_id ${userTenentId} and payload:`,
    JSON.stringify({ data: blog }, null, 2)
  );
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.post<FindOne<Blog>>(
      url,
      { data: blog },
      { headers, params }
    );

    if (!response.data || !response.data.data) {
      console.error(
        `[createBlog] Unexpected API response structure after creation from ${url}:`,
        response.data
      );
      throw new Error("Unexpected API response structure after creation.");
    }
    console.log(
      `[createBlog] Created Blog Data for tenent_id ${userTenentId}:`,
      response.data.data
    );
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to create blog for tenent_id ${userTenentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data || { message: error.message };
      console.error(
        `[createBlog] Failed to create blog at ${url} (${status}) for tenent_id ${userTenentId}:`,
        errorData
      );
      const strapiErrorMessage = (errorData as any)?.error?.message;
      const strapiErrorDetails = (errorData as any)?.error?.details;
      console.error("[createBlog] Strapi Error Details:", strapiErrorDetails);
      message =
        strapiErrorMessage ||
        `Failed to create blog (${status}) - ${
          (errorData as any).message || "Unknown API error"
        }`;
    } else if (error instanceof Error) {
      console.error(
        `[createBlog] Generic Error for tenent_id ${userTenentId}:`,
        error.message
      );
      message = error.message;
    } else {
      console.error(
        `[createBlog] Unknown Error for tenent_id ${userTenentId}:`,
        error
      );
    }
    throw new Error(message);
  }
};


// Update a blog by its numeric id.
export const updateBlog = async (
  id: string,
  blog: Partial<CreateBlogPayload>,
  userTenentIdAuthContext: string
): Promise<Blog> => {
  const { tenent_id, ...updateData } = blog;
  if (tenent_id) {
    console.warn(
      `[Service updateBlog]: tenent_id was present in update payload for blog ID ${id} but is being excluded. tenent_id should not be updated.`
    );
  }

  const url = `/blogs/${id}`; // Use numeric ID for the PUT request path
  console.log(
    `[updateBlog] Updating blog ID ${id} at ${url} (Auth context tenent_id: ${userTenentIdAuthContext}) with payload:`,
    JSON.stringify({ data: updateData }, null, 2)
  );
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.put<FindOne<Blog>>(
      url,
      { data: updateData },
      {
        headers,
        params: { populate: "*" },
      }
    );

    if (!response.data || !response.data.data) {
      console.error(
        `[updateBlog] Unexpected API response structure after update for blog ID ${id} from ${url}:`,
        response.data
      );
      throw new Error("Unexpected API response structure after update.");
    }

    console.log(
      `[updateBlog] Updated Blog ID ${id} Data (Auth context tenent_id ${userTenentIdAuthContext}):`,
      response.data.data
    );
    return response.data.data;
  } catch (error: unknown) {
    let message = `Failed to update blog ID ${id}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data || { message: error.message };
      if (status === 404) {
        console.error(
          `[updateBlog] Blog ID ${id} not found (Status: ${status}).`
        );
        throw new Error(`Blog not found (Status: ${status}).`);
      }
      if (status === 403) {
        console.error(
          `[updateBlog] Update forbidden for blog ID ${id} (Status: ${status}).`
        );
        throw new Error(`Update forbidden (Status: ${status}).`);
      }
      console.error(
        `[updateBlog] Failed to update blog ID ${id} at ${url} (${status}):`,
        errorData
      );
      const strapiErrorMessage = (errorData as any)?.error?.message;
      const strapiErrorDetails = (errorData as any)?.error?.details;
      console.error("[updateBlog] Strapi Error Details:", strapiErrorDetails);
      message =
        strapiErrorMessage ||
        `Failed to update blog ID ${id} (${status}) - ${
          (errorData as any).message || "Unknown API error"
        }`;
    } else if (error instanceof Error) {
      console.error(
        `[updateBlog] Generic Error for blog ID ${id}:`,
        error.message
      );
      message = error.message;
    } else {
      console.error(`[updateBlog] Unknown Error for blog ID ${id}:`, error);
    }
    throw new Error(message);
  }
};

// Delete a blog by its string documentId.
export const deleteBlog = async (
  documentId: string,
  userTenentIdAuthContext: string
): Promise<Blog | void> => {
  const url = `/blogs/${documentId}`; // Use documentId for the DELETE request path
  console.log(
    `[deleteBlog] Deleting blog documentId ${documentId} at ${url} (Auth context tenent_id: ${userTenentIdAuthContext})`
  );
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.delete<FindOne<Blog>>(url, {
      headers,
    });

    if (response.status === 200 || response.status === 204) {
      console.log(
        `[deleteBlog] Successfully deleted blog documentId ${documentId}.`
      );
      return response.data?.data;
    } else {
      console.warn(
        `[deleteBlog] Unexpected success status ${response.status} when deleting blog documentId ${documentId} at ${url}.`
      );
      return response.data?.data;
    }
  } catch (error: unknown) {
    let message = `Failed to delete blog documentId ${documentId}.`;
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data || { message: error.message };
      if (status === 404) {
        console.error(
          `[deleteBlog] Blog documentId ${documentId} not found (Status: ${status}).`
        );
        throw new Error(`Blog not found (Status: ${status}).`);
      }
      if (status === 403) {
        console.error(
          `[deleteBlog] Delete forbidden for blog documentId ${documentId} (Status: ${status}).`
        );
        throw new Error(`Delete forbidden (Status: ${status}).`);
      }
      console.error(
        `[deleteBlog] Failed to delete blog documentId ${documentId} at ${url} (${status}):`,
        errorData
      );
      const strapiErrorMessage = (errorData as any)?.error?.message;
      message =
        strapiErrorMessage ||
        `Failed to delete blog documentId ${documentId} (${status}) - ${
          (errorData as any).message || "Unknown API error"
        }`;
    } else if (error instanceof Error) {
      console.error(
        `[deleteBlog] Generic Error for blog documentId ${documentId}:`,
        error.message
      );
      message = error.message;
    } else {
      console.error(
        `[deleteBlog] Unknown Error for blog documentId ${documentId}:`,
        error
      );
    }
    throw new Error(message);
  }
};
