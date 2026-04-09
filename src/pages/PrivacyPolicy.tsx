import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, Wifi, ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ParticleBackground from "@/components/layout/ParticleBackground";

const sections = [
  {
    title: "Information We Collect",
    content: `We collect the following types of information when you use GlimseConnect:

**Personal Information:** Name, email address, date of birth, country, gender, profile photo, username, bio, and interests you provide during registration.

**Device Information:** Browser type, operating system, device identifiers, IP address, and general location data.

**Usage Data:** Pages visited, features used, streaming session durations, messages sent, interactions with other users, and search queries.

**Camera/Microphone Data:** During live video streams, your camera and microphone data is transmitted peer-to-peer to the connected user. We do not record or store video/audio streams.

**Chat Messages:** Text messages, images, and voice messages sent through our messaging feature are stored in our database to provide the chat service.`,
  },
  {
    title: "How We Use Your Information",
    content: `We use the information we collect to:

• **Provide our services** — facilitate video matching, messaging, and social features
• **Smart matching** — use your preferences, country, interests, and gender to find compatible connections
• **Safety & moderation** — detect and prevent abuse, harassment, and violations of our community guidelines
• **Analytics** — understand how users interact with our platform to improve the experience
• **Communication** — send you notifications about followers, messages, and important account updates
• **Personalization** — show relevant user suggestions and content based on your interests`,
  },
  {
    title: "Video Streaming Data",
    content: `**Peer-to-Peer Technology:** Video and audio streams are transmitted directly between users using WebRTC technology. GlimseConnect servers facilitate the initial connection but do not process, record, or store any video or audio content.

**Face Detection:** Our face detection feature operates entirely on your device (client-side). It uses brightness analysis to detect if your camera is covered. No biometric data is collected, stored, or transmitted to our servers.

**Content Moderation:** We employ automated systems to detect potential violations. If a user is reported, relevant information may be reviewed by our safety team.`,
  },
  {
    title: "Call History Data",
    content: `**What we collect:** Call participants, call duration, call type (random/friend/group), start and end times, end reason, connection quality metrics, call ratings, and gift transactions during calls.

**What we do NOT collect:** We do NOT record audio or video content of calls. All calls are peer-to-peer encrypted via WebRTC (DTLS/SRTP). No biometric or facial recognition data is collected or stored.

**Why:** To provide the call history feature, improve matching quality, ensure platform safety (correlate reports with call records), and provide usage analytics to users.

**Retention:** Call history metadata is retained for up to **2 years**. Users can hide individual call records from their history view. All call history is permanently deleted upon account deletion.

**Face detection:** Processed entirely on-device. No facial images or biometric data is transmitted to or stored on our servers.`,
  },
  {
    title: "Virtual Currency & Transaction Data",
    content: `**What we collect:** Coin purchase amounts, payment method details (last 4 digits only, via Stripe), gift transaction history (gift type, recipient, timestamp, context), wallet balances, and diamond earnings.

**Why:** To process transactions, prevent fraud, provide gift history to users, maintain leaderboards, and comply with financial regulations.

**Retention:** Transaction records are retained for **7 years** for financial and legal compliance purposes. Anonymized aggregate data may be retained indefinitely.

**Third-party sharing:** Payment processing is handled by **Stripe**. We share necessary transaction data with Stripe; we do not store full credit card numbers. Refer to Stripe's Privacy Policy for details.

**Your rights:** You can request an export of your full transaction history. Account deletion anonymizes transaction records but aggregate financial data is retained for compliance. You cannot request deletion of specific financial transaction records within the 7-year retention period.`,
  },
  {
    title: "Information Sharing",
    content: `We do **not** sell your personal data to third parties. We may share information with:

• **Law Enforcement:** When required by law, subpoena, or to protect the safety of our users
• **Service Providers:** Third-party services that help us operate (hosting, analytics, email delivery)
• **Safety Reports:** Information related to reports of abuse may be reviewed by our moderation team
• **Aggregated Data:** Non-identifiable, aggregated statistics may be shared publicly`,
  },
  {
    title: "Data Retention",
    content: `• **Account data** is retained while your account is active
• Upon account deletion, personal data is removed within **30 days**
• **Chat messages** are retained for **90 days** after account deletion
• **Moderation logs** (reports, actions taken) are retained for **1 year** for safety purposes
• **Anonymized analytics data** may be retained indefinitely`,
  },
  {
    title: "Your Rights",
    content: `You have the right to:

• **Access** your personal data
• **Correct** inaccurate information
• **Delete** your account and associated data
• **Export** your data in a portable format
• **Opt-out** of marketing communications
• **Restrict** processing of your data in certain circumstances

To exercise any of these rights, visit your Settings page or contact us at privacy@glimseconnect.com.`,
  },
  {
    title: "Cookies & Tracking",
    content: `We use the following types of cookies:

• **Essential Cookies:** Required for authentication and session management
• **Preference Cookies:** Remember your settings and preferences
• **Analytics Cookies:** Google Analytics to understand usage patterns
• **Advertising Cookies:** Google AdSense for serving relevant advertisements

We also use **local storage** to cache gift catalog data and animation assets for performance, reducing load times.

You can manage cookie preferences through our cookie consent banner or your browser settings. See our [Cookie Policy](/cookie-policy) for more details.`,
  },
  {
    title: "Children's Privacy",
    content: `GlimseConnect is strictly for users aged **18 and older**. We do not knowingly collect personal information from anyone under 18. If we discover that a user is under 18, their account will be immediately terminated and all associated data will be deleted.`,
  },
  {
    title: "International Data Transfers",
    content: `Your data may be processed and stored in servers located in different countries. We ensure appropriate safeguards are in place for international data transfers, including standard contractual clauses and compliance with applicable data protection regulations.`,
  },
  {
    title: "Security",
    content: `We implement industry-standard security measures to protect your data:

• **Encryption in transit** using TLS/SSL
• **Encryption at rest** for stored data
• **Regular security audits** and penetration testing
• **Access controls** limiting who can access user data
• **Two-factor authentication** available for accounts`,
  },
  {
    title: "Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the app or via email at least **30 days** before the changes take effect. Continued use of GlimseConnect after changes constitute acceptance of the updated policy.`,
  },
  {
    title: "Contact Us",
    content: `For privacy-related inquiries:

• **Email:** privacy@glimseconnect.com
• **Contact Form:** [glimseconnect.com/contact](/contact)
• **Data Protection Officer:** dpo@glimseconnect.com`,
  },
];

const PrivacyPolicy = () => {
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
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Privacy Policy
              </h1>
            </div>
            <p className="text-muted-foreground">Last Updated: March 1, 2026</p>
            <p className="text-muted-foreground mt-4">
              At GlimseConnect, we take your privacy seriously. This Privacy
              Policy explains how we collect, use, share, and protect your
              personal information when you use our platform.
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

export default PrivacyPolicy;
