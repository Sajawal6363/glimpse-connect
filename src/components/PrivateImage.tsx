import { useState, type ReactNode } from "react";
import { useSignedUrl } from "@/lib/storage";

/**
 * Renders an image from a private Supabase storage bucket.
 * Automatically resolves the URL to a signed URL.
 * Shows `fallback` while loading or if the image fails to load.
 */
const PrivateImage = ({
  src,
  fallback,
  className = "w-full h-full object-cover",
  alt = "",
}: {
  src?: string | null;
  fallback?: ReactNode;
  className?: string;
  alt?: string;
}) => {
  const { url, loading } = useSignedUrl(src);
  const [errored, setErrored] = useState(false);

  if (!src || loading || !url || errored) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
};

export default PrivateImage;
