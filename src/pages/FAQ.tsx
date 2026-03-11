import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { HelpCircle, Wifi, ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ParticleBackground from "@/components/layout/ParticleBackground";

const categories = [
  {
    title: "General",
    faqs: [
      {
        q: "What is ConnectLive?",
        a: "ConnectLive is a next-generation video platform that lets you connect with strangers worldwide through live video calls. It features AI-powered safety, smart matching based on interests, and social features like following and messaging.",
      },
      {
        q: "Is ConnectLive free?",
        a: "Yes! ConnectLive offers a free plan with basic features including random video matching, 5 skips per hour, and text chat with mutual followers. Premium and VIP plans are available for enhanced features.",
      },
      {
        q: "What countries are supported?",
        a: "ConnectLive is available worldwide in 190+ countries. You can filter matches by country to connect with people from specific regions.",
      },
    ],
  },
  {
    title: "Account",
    faqs: [
      {
        q: "How do I create an account?",
        a: "Click 'Sign Up' on the landing page and follow the 3-step registration: enter your email and password, fill in your profile details, then select your interests. You must be 18+ to create an account.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → scroll to the bottom → click 'Delete Account'. You'll need to type 'DELETE' to confirm. This action is permanent and all your data will be removed within 30 days.",
      },
      {
        q: "How do I change my password?",
        a: "Go to Settings → Account → Change Password. Enter your current password and your new password. You can also use 'Forgot Password' on the login page to reset via email.",
      },
      {
        q: "How do I get a verified badge?",
        a: "Verified badges are automatically given to Premium and VIP subscribers. They indicate that the user is a paying member of the ConnectLive community.",
      },
    ],
  },
  {
    title: "Streaming",
    faqs: [
      {
        q: "How does matching work?",
        a: "When you click 'Start Streaming', you're placed in a queue. Our matching algorithm pairs you with compatible users based on your filters (country, gender) and shared interests. Premium users get priority matching.",
      },
      {
        q: "Can I choose who to talk to?",
        a: "You can set filters for country and gender preferences. Interest-based matching is available for Premium users. You can always skip a stranger to find a new match.",
      },
      {
        q: "What if someone is inappropriate?",
        a: "Use the Report button to flag inappropriate behavior. You can also click Block to prevent future matches. Skip immediately if you feel uncomfortable. Our AI moderation also detects violations.",
      },
      {
        q: "Why do I need to show my face?",
        a: "Face detection ensures authentic, respectful conversations. If your camera is covered or your face isn't visible for too long, you'll receive a warning. This helps maintain a safe environment for everyone.",
      },
      {
        q: "Can I record calls?",
        a: "No. Recording other users without their consent is strictly prohibited and violates our Terms of Service. Violators will face immediate account termination.",
      },
    ],
  },
  {
    title: "Chat & Social",
    faqs: [
      {
        q: "How does chat work?",
        a: "You can chat with users who mutually follow each other. Send text messages, images, voice messages, and emojis. Messages are delivered in real-time.",
      },
      {
        q: "Can I message anyone?",
        a: "By default, you can only message users who follow you back (mutual follows). This prevents spam and unwanted messages. Users can optionally allow messages from non-followers in their settings.",
      },
      {
        q: "What are mutual follows?",
        a: "A mutual follow is when both you and another user follow each other. This unlocks the ability to send direct messages and is indicated in the chat section.",
      },
    ],
  },
  {
    title: "Privacy & Safety",
    faqs: [
      {
        q: "Is my video recorded?",
        a: "No. Video streams are peer-to-peer (P2P) using WebRTC technology. ConnectLive servers only facilitate the initial connection — your video and audio data is transmitted directly between you and the other user.",
      },
      {
        q: "How does content moderation work?",
        a: "We use a combination of AI-powered detection and user reports. Our system monitors for violations in real-time. Reported content is reviewed by our safety team within 24 hours.",
      },
      {
        q: "How do I report someone?",
        a: "During a stream, click the Report button (flag icon). Select the reason for your report and optionally add a description. You can also report from a user's profile page.",
      },
      {
        q: "How do I block someone?",
        a: "Click the Block button during a stream, or go to a user's profile and select Block. Blocked users cannot match with you or send you messages. Manage blocked users in Settings.",
      },
    ],
  },
  {
    title: "Premium",
    faqs: [
      {
        q: "What does Premium include?",
        a: "Premium includes unlimited skips, all filters (country, gender, interest-based matching), ad-free experience, priority matching, HD video, verified badge, voice messages, and priority support.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "Go to Settings → Account → Manage Subscription. Click 'Cancel Subscription'. Your premium features will remain active until the end of your billing period.",
      },
      {
        q: "What is the refund policy?",
        a: "We offer a 7-day refund policy for first-time subscribers who haven't used premium features extensively. Contact support@connectlive.com for refund requests.",
      },
    ],
  },
  {
    title: "Gifts & ConnectCoins",
    faqs: [
      {
        q: "What are ConnectCoins?",
        a: "ConnectCoins (💰) are ConnectLive's virtual currency used to purchase and send gifts to other users during live calls, in chat, or on profiles. They can be purchased in the Gift Shop from the sidebar.",
      },
      {
        q: "How do I buy ConnectCoins?",
        a: "Go to Gift Shop from the sidebar or tap the 💰 balance indicator in the top navbar. Select a coin package (Starter at $0.99 up to Whale at $99.99) and complete your purchase via our secure payment system.",
      },
      {
        q: "How do I send a gift during a call?",
        a: "During any live call (random, friend, or group), tap the 🎁 gift button in the call controls bar. A gift tray slides up showing all available gifts organized by rarity. Select a gift you can afford and tap Send.",
      },
      {
        q: "What are Diamonds?",
        a: "Diamonds (💎) are earned when you receive gifts. Every 1 coin of gift value you receive = 1 diamond earned. Diamonds represent your social status on ConnectLive and appear on your profile. They currently cannot be converted to cash.",
      },
      {
        q: "What's the difference between gift rarities?",
        a: "Common gifts (1–49 coins) play a simple float animation. Rare gifts (50–199 coins) trigger a burst effect with particles. Epic gifts (200–999 coins) take over the full screen with themed animations. Legendary gifts (1,000+ coins) play a cinematic 6–10 second premium animation for both users.",
      },
      {
        q: "Can I refund purchased coins?",
        a: "Unused coins may be refunded within 14 days of purchase. Once coins have been used to send gifts, they are non-refundable. EU consumers have a 14-day statutory cooling-off period. Contact support@connectlive.com for refund requests.",
      },
      {
        q: "Can I transfer coins to another user?",
        a: "No. ConnectCoins can only be used to send gifts — they cannot be directly transferred between users. Attempting to sell or trade virtual currency violates our Terms of Service.",
      },
      {
        q: "What happens to my coins if I delete my account?",
        a: "All virtual currency (coins and diamonds) is permanently forfeited upon account deletion. Please spend or use your coins before deleting your account.",
      },
    ],
  },
  {
    title: "Call History",
    faqs: [
      {
        q: "Where can I see my call history?",
        a: "Go to History in the sidebar (clock icon). You'll see all calls that lasted 30 seconds or more, including random stranger calls, friend calls, and group calls, with duration, gifts exchanged, and connection quality.",
      },
      {
        q: "Are my video calls recorded?",
        a: "No. All video and audio is transmitted peer-to-peer via WebRTC (DTLS/SRTP encrypted). ConnectLive only stores call metadata (duration, participants, timestamps) — never the actual audio or video content.",
      },
      {
        q: "Why do some calls not appear in my history?",
        a: "Calls shorter than 30 seconds are automatically excluded from your history. Only meaningful conversations are saved.",
      },
      {
        q: "Can I rate a call after it ends?",
        a: "Yes! A rating card appears after each call ends. You can rate 1–5 stars. Ratings are anonymous and help us improve our matching algorithm.",
      },
      {
        q: "How long is call history kept?",
        a: "Call metadata is retained for up to 2 years. You can hide individual sessions from your history view. All history is permanently deleted when you delete your account.",
      },
    ],
  },
  {
    title: "Technical",
    faqs: [
      {
        q: "Which browsers are supported?",
        a: "ConnectLive works best on Chrome, Firefox, Edge, and Safari (latest versions). WebRTC support is required for video streaming.",
      },
      {
        q: "My camera/mic isn't working?",
        a: "Make sure you've granted camera and microphone permissions in your browser. Check that no other app is using your camera. Try refreshing the page or restarting your browser.",
      },
      {
        q: "I'm having connection issues?",
        a: "Connection issues can be caused by slow internet, firewall restrictions, or VPN usage. Try disabling your VPN, using a wired connection, or switching to a different network.",
      },
    ],
  },
];

const FAQ = () => {
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
              ConnectLive
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-muted-foreground">
              Find answers to common questions about ConnectLive.
            </p>
          </div>

          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.title}>
                <h2 className="text-lg font-bold text-foreground mb-3 px-2">
                  {category.title}
                </h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.faqs.map((faq, i) => (
                    <AccordionItem
                      key={i}
                      value={`${category.title}-${i}`}
                      className="glass rounded-2xl border-none px-6"
                    >
                      <AccordionTrigger className="text-foreground text-sm font-medium hover:no-underline py-4">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm pb-4 leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="glass rounded-3xl p-8 mt-8 text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-4">
              Our support team is here to help.
            </p>
            <Link
              to="/contact"
              className="text-primary hover:underline font-semibold"
            >
              Contact Us →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQ;
