import { AvatarImage } from "@/components/ui/avatar";
import { useSignedUrl } from "@/lib/storage";

/**
 * Drop-in replacement for shadcn's <AvatarImage> that resolves
 * private Supabase storage URLs to signed URLs.
 */
const PrivateAvatarImage = ({
  src,
  ...props
}: React.ComponentProps<typeof AvatarImage>) => {
  const { url } = useSignedUrl(typeof src === "string" ? src : undefined);
  return <AvatarImage {...props} src={url || undefined} />;
};

export default PrivateAvatarImage;
