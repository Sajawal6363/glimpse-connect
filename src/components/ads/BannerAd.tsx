const BannerAd = () => {
  return (
    <div
      className="w-full flex items-center justify-center bg-muted/20 border border-border/20 rounded-xl overflow-hidden"
      style={{ minHeight: 90, maxWidth: 728, margin: "0 auto" }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "inline-block", width: 728, height: 90 }}
        data-ad-client={
          import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-XXXXXXXXXXXXXXXX"
        }
        data-ad-slot="banner-slot"
      />
      <p className="text-xs text-muted-foreground/50 absolute">Advertisement</p>
    </div>
  );
};

export default BannerAd;
