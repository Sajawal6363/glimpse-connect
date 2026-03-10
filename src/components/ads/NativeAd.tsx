const NativeAd = () => {
  return (
    <div className="glass rounded-2xl p-4 border border-border/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
          Sponsored
        </span>
      </div>
      <div
        className="w-full bg-muted/20 rounded-xl flex items-center justify-center"
        style={{ minHeight: 120 }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: 120 }}
          data-ad-client={
            import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-XXXXXXXXXXXXXXXX"
          }
          data-ad-slot="native-slot"
          data-ad-format="fluid"
        />
        <p className="text-xs text-muted-foreground/50">Advertisement</p>
      </div>
    </div>
  );
};

export default NativeAd;
