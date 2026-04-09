import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Cookie, Wifi, ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ParticleBackground from "@/components/layout/ParticleBackground";

const sections = [
  {
    title: "What Are Cookies?",
    content: `Cookies are small text files that are stored on your device when you visit a website. They help the website remember information about your visit, such as your preferred language and other settings, making your next visit easier and the site more useful to you.`,
  },
  {
    title: "Essential Cookies",
    content: `These cookies are necessary for the website to function properly. They include:

• **Authentication cookies** — keep you logged in during your session
• **Session management** — maintain your connection state
• **Security cookies** — protect against CSRF and other attacks
• **Load balancing** — distribute traffic across servers

These cookies cannot be disabled as the site would not function without them.`,
  },
  {
    title: "Functional Cookies",
    content: `These cookies allow the website to remember choices you make:

• **Theme preference** — dark/light mode setting
• **Language preferences** — your preferred language
• **Filter settings** — your streaming filter preferences
• **Cookie consent** — your cookie preference choice

You can disable these in your browser settings, but some features may not work as expected.`,
  },
  {
    title: "Analytics Cookies",
    content: `We use Google Analytics to understand how visitors interact with our website:

• **Pages visited** and time spent on each page
• **Traffic sources** — how users find our site
• **User demographics** — general age range and interests
• **Device information** — browser, screen size, OS

Data collected is aggregated and anonymized. You can opt out by disabling analytics cookies in our consent banner.`,
  },
  {
    title: "Advertising Cookies",
    content: `We use Google AdSense to serve advertisements:

• **Ad personalization** — show ads relevant to your interests
• **Frequency capping** — limit how often you see the same ad
• **Ad performance** — measure click rates and conversions

Premium subscribers do not see advertisements and these cookies are not used.`,
  },
  {
    title: "Third-Party Cookies",
    content: `Some cookies are set by third-party services we use:

• **Google** (Analytics, AdSense) — analytics and advertising
• **Supabase** — authentication and session management

These third parties have their own privacy policies. We recommend reviewing them.`,
  },
  {
    title: "How to Manage Cookies",
    content: `You can control cookies through:

1. **Our cookie consent banner** — shown on first visit
2. **Browser settings** — most browsers allow you to block or delete cookies
3. **Browser extensions** — privacy-focused extensions can block tracking

**Note:** Blocking essential cookies will prevent you from using GlimseConnect.

**Popular browser cookie settings:**
• Chrome: Settings → Privacy and Security → Cookies
• Firefox: Settings → Privacy & Security → Cookies
• Safari: Settings → Privacy → Manage Website Data
• Edge: Settings → Privacy → Cookies`,
  },
];

const CookiePolicy = () => {
  return (
    <div className="min-h-screen relative">
      <ParticleBackground />
      <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Wifi className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold neon-text-blue text-primary">
              GlimseConnect
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="glass rounded-3xl p-8 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Cookie Policy
              </h1>
            </div>
            <p className="text-muted-foreground">Last Updated: March 1, 2026</p>
            <p className="text-muted-foreground mt-4">
              This Cookie Policy explains how GlimseConnect uses cookies and
              similar technologies to recognize you when you visit our platform.
            </p>
          </div>

          <Accordion type="multiple" className="space-y-3">
            {sections.map((section, i) => (
              <AccordionItem
                key={i}
                value={`section-${i}`}
                className="glass rounded-2xl border-none px-6"
              >
                <AccordionTrigger className="text-foreground font-semibold hover:no-underline py-5">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-line pb-5 leading-relaxed">
                  {section.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </div>
  );
};

export default CookiePolicy;
