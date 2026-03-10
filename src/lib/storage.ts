import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const BUCKET = "connectlive";
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour in seconds

/**
 * In-memory cache: storageUrl → { signedUrl, expiresAt }
 * Prevents re-fetching signed URLs on every render.
 */
const signedUrlCache = new Map<
  string,
  { signedUrl: string; expiresAt: number }
>();

/**
 * Extract the storage file path from a full Supabase storage URL.
 * Handles both public and authenticated URL formats.
 *
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/connectlive/avatars/user.jpg?t=123"
 *   → "avatars/user.jpg"
 */
export function getStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;

  // Remove query params
  const clean = url.split("?")[0];

  // Match: /storage/v1/object/public/connectlive/...path
  // or:    /storage/v1/object/sign/connectlive/...path
  // or:    /storage/v1/object/connectlive/...path
  const patterns = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/storage/v1/object/sign/${BUCKET}/`,
    `/storage/v1/object/${BUCKET}/`,
    `/storage/v1/object/authenticated/${BUCKET}/`,
  ];

  for (const pattern of patterns) {
    const idx = clean.indexOf(pattern);
    if (idx !== -1) {
      return clean.substring(idx + pattern.length);
    }
  }

  // Maybe it's already just a path (no URL prefix)
  if (!url.startsWith("http")) {
    return url.split("?")[0];
  }

  return null;
}

/**
 * Get a signed URL for a private storage file.
 * Uses in-memory cache to avoid redundant API calls.
 * Returns null if the URL doesn't point to our storage bucket.
 */
export async function getSignedUrl(
  originalUrl: string | null | undefined,
): Promise<string | null> {
  if (!originalUrl) return null;

  const path = getStoragePath(originalUrl);
  if (!path) return originalUrl; // Not a storage URL, return as-is

  // Check cache
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.signedUrl;
  }

  // Generate signed URL
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    console.warn("Failed to create signed URL for:", path, error);
    return null;
  }

  // Cache it (expire 5 min before actual expiry to be safe)
  signedUrlCache.set(path, {
    signedUrl: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_URL_EXPIRY - 300) * 1000,
  });

  return data.signedUrl;
}

/**
 * React hook that resolves a storage URL to a signed URL.
 * Returns { url, loading }.
 */
export function useSignedUrl(originalUrl: string | null | undefined): {
  url: string | null;
  loading: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!originalUrl);

  useEffect(() => {
    if (!originalUrl) {
      setUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Check cache synchronously first
    const path = getStoragePath(originalUrl);
    if (path) {
      const cached = signedUrlCache.get(path);
      if (cached && cached.expiresAt > Date.now()) {
        setUrl(cached.signedUrl);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    getSignedUrl(originalUrl).then((signed) => {
      if (!cancelled) {
        setUrl(signed);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [originalUrl]);

  return { url, loading };
}

/**
 * Upload a file and return a signed URL (for private buckets).
 */
export async function uploadAndGetSignedUrl(
  filePath: string,
  file: File | Blob,
  options?: { upsert?: boolean },
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, options);

  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    throw new Error("Failed to generate signed URL");
  }

  // We store the public-style URL in DB so we can always extract the path later.
  // This is the canonical reference — signed URLs expire.
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
