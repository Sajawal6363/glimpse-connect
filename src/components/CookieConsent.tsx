import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem(
      "cookie-consent",
      JSON.stringify({
        essential: true,
        functional: true,
        analytics: true,
        advertising: true,
      }),
    );
    setVisible(false);
  };

  const acceptEssential = () => {
    localStorage.setItem(
      "cookie-consent",
      JSON.stringify({
        essential: true,
        functional: false,
        analytics: false,
        advertising: false,
      }),
    );
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-6"
      >
        <div className="max-w-4xl mx-auto glass rounded-2xl p-6 border border-border/50 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                We use cookies 🍪
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We use cookies to enhance your experience, analyze site traffic,
                and serve personalized content. By clicking "Accept All", you
                consent to our use of cookies. Read our{" "}
                <a
                  href="/cookie-policy"
                  className="text-primary hover:underline"
                >
                  Cookie Policy
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={acceptAll}
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-xl neon-glow-blue"
                >
                  Accept All
                </Button>
                <Button
                  variant="outline"
                  onClick={acceptEssential}
                  className="glass border-border/50 rounded-xl"
                >
                  Essential Only
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsent;
