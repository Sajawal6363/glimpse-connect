import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, Wifi, ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ParticleBackground from "@/components/layout/ParticleBackground";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By creating an account or using GlimseConnect, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our service. These terms constitute a legally binding agreement between you and GlimseConnect.`,
  },
  {
    title: "2. Eligibility",
    content: `To use GlimseConnect, you must:
• Be at least **18 years of age**
• Provide accurate and truthful information during registration
• Not have been previously banned from the platform
• Be legally capable of entering into a binding agreement
• Not be a resident of a jurisdiction where the service is prohibited`,
  },
  {
    title: "3. Account Responsibilities",
    content: `You are responsible for:
• Keeping your login credentials secure and confidential
• All activity that occurs under your account
• Notifying us immediately of any unauthorized access
• Maintaining accurate and up-to-date profile information
• Not sharing your account with others or creating multiple accounts`,
  },
  {
    title: "4. Acceptable Use Policy",
    content: `You agree NOT to:
• Display nudity or sexual content on camera
• Engage in harassment, bullying, or threatening behavior
• Use hate speech or discriminatory language
• Send spam or unsolicited promotional content
• Impersonate another person or entity
• Allow minors to access or appear in your streams
• Engage in or promote illegal activity
• Use the platform for commercial solicitation without permission
• Attempt to hack, exploit, or disrupt the service
• Collect user data without consent`,
  },
  {
    title: "5. Streaming Conduct Rules",
    content: `During live video sessions:
• You **must show your face** during calls — camera-covered detection is active
• **Do not record** other users without their explicit consent
• **Do not share explicit content** — this results in immediate action
• **Respect boundaries** — if someone asks you to stop, stop immediately
• Use the **report** and **skip** buttons for uncomfortable situations
• Background content must also comply with our guidelines`,
  },
  {
    title: "5A. Call Recording & History",
    content: `GlimseConnect logs call metadata (duration, participants, timestamps, connection quality) for service improvement and safety.

• Video/audio content is **NOT recorded or stored** by GlimseConnect; all calls are peer-to-peer encrypted via WebRTC (DTLS/SRTP)
• Users may **NOT** record other users' video or audio without explicit consent
• Call history metadata is stored for up to **2 years** and can be hidden or deleted by the user from their History view
• Gift transactions during calls are logged and visible to both sender and receiver
• Call ratings are used to improve matching quality
• GlimseConnect may use anonymized, aggregated call metadata for analytics and service improvement
• Face detection runs entirely on the user's device — no biometric data is transmitted to our servers`,
  },
  {
    title: "6. Content Ownership",
    content: `• You retain ownership of content you create and share on GlimseConnect
• By using the platform, you grant GlimseConnect a non-exclusive, worldwide, royalty-free license to display, distribute, and store your content as necessary to operate the service
• You represent that you have the right to share any content you upload
• GlimseConnect does not claim ownership of user-generated content`,
  },
  {
    title: "6A. Virtual Currency & Gifts (ConnectCoins)",
    content: `GlimseConnect offers a virtual currency system called **ConnectCoins** (💰) and a Diamonds (💎) reward system.

**Coins:**
• ConnectCoins are a virtual currency with **no real-world monetary value** outside of GlimseConnect
• Coins are **non-transferable** between users and **non-refundable** (except as required by law)
• Coins expire after **12 months** of account inactivity
• GlimseConnect reserves the right to modify coin pricing, gift costs, and gift availability at any time
• Purchases are final; no refunds for used coins
• Unused coins may be requested for refund within **14 days** of purchase (EU consumers: 14-day statutory cooling-off period applies)
• All prices are in USD unless otherwise stated; applicable taxes may apply
• In-app purchases are processed through third-party payment providers (Stripe); GlimseConnect is not responsible for payment processing errors

**Diamonds:**
• Diamonds are earned when you receive gifts (1 diamond = 1 coin value of gift received)
• Diamonds are for **status display purposes only** and have no monetary value
• Diamonds cannot be cashed out or exchanged for real money

**Gifts:**
• Gifts are cosmetic features that trigger visual animations; they do not confer additional platform privileges
• GlimseConnect is not responsible for gifts sent to unintended recipients
• Gift animations are subject to change without notice

**Prohibited Conduct:**
• Users may not sell, trade, or transfer virtual items for real money
• Any attempt to manipulate the gifting system (bots, fraud, self-gifting via alt accounts) results in **permanent ban** and forfeiture of all virtual currency
• Gifting to solicit inappropriate behavior, explicit content, or as payment for services is a Terms violation resulting in permanent ban
• GlimseConnect reserves the right to revoke virtual currency in cases of fraud or abuse`,
  },
  {
    title: "7. Moderation & Enforcement",
    content: `GlimseConnect employs a strike system:
• **First violation:** Warning notification
• **Second violation:** 24-hour temporary ban
• **Third violation:** Permanent account ban

Severe violations (CSAM, threats of violence, etc.) result in **immediate permanent ban** and may be reported to law enforcement.

We use a combination of AI-assisted moderation, user reports, and manual review to enforce our guidelines. We reserve the right to remove any content or terminate any account that violates these terms.

**Gifting-related violations:**
• Misuse of the gifting system (gifting to manipulate, as payment for explicit content, or for any unlawful purpose) is a Terms violation
• Users sending gifts to solicit inappropriate behavior will be permanently banned
• Virtual currency associated with a banned account is forfeited`,
  },
  {
    title: "8. Intellectual Property",
    content: `The GlimseConnect name, logo, branding, design, and source code are the intellectual property of GlimseConnect. You may not copy, modify, distribute, or create derivative works based on our intellectual property without prior written consent.`,
  },
  {
    title: "9. Disclaimers",
    content: `The service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.

• We do not guarantee you will find matches or connections
• We are not responsible for the behavior or actions of other users
• Service availability may be interrupted for maintenance
• We do not guarantee the accuracy of user profiles`,
  },
  {
    title: "10. Limitation of Liability",
    content: `To the maximum extent permitted by law, GlimseConnect's total liability for any claims arising from or related to the service shall not exceed the total amount paid by you to GlimseConnect in the **12 months** preceding the claim, or **$100**, whichever is greater.

GlimseConnect is not liable for any indirect, incidental, special, consequential, or punitive damages.`,
  },
  {
    title: "11. Indemnification",
    content: `You agree to indemnify and hold harmless GlimseConnect, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the service, violation of these terms, or infringement of any third-party rights.`,
  },
  {
    title: "12. Termination",
    content: `• **By you:** You may delete your account at any time through Settings
• **By us:** We may suspend or terminate your account for violations
• Upon termination, your right to use the service ceases immediately
• Data retention after termination is governed by our Privacy Policy`,
  },
  {
    title: "13. Governing Law & Dispute Resolution",
    content: `These terms are governed by the laws of the State of Delaware, United States. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You agree to waive any right to participate in class action lawsuits.`,
  },
  {
    title: "14. Changes to Terms",
    content: `We may modify these Terms of Service at any time. We will provide at least **30 days notice** for material changes via email or in-app notification. Continued use of GlimseConnect after changes take effect constitutes acceptance of the modified terms.`,
  },
];

const TermsOfService = () => {
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
              <FileText className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Terms of Service
              </h1>
            </div>
            <p className="text-muted-foreground">Last Updated: March 1, 2026</p>
            <p className="text-muted-foreground mt-4">
              Welcome to GlimseConnect. These Terms of Service govern your use of
              our platform. Please read them carefully before using the service.
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

export default TermsOfService;
