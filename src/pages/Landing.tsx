import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video,
  Shield,
  MessageCircle,
  Users,
  Wifi,
  ArrowRight,
  Zap,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PrivateAvatarImage from "@/components/PrivateAvatarImage";
import ParticleBackground from "@/components/layout/ParticleBackground";
import { useAuthStore } from "@/stores/useAuthStore";

const features = [
  {
    icon: Video,
    title: "Live Video Streaming",
    description:
      "Connect with random strangers worldwide through crystal-clear HD video calls",
    color: "text-primary",
    glow: "neon-glow-blue",
  },
  {
    icon: Shield,
    title: "AI-Powered Safety",
    description:
      "Advanced face detection & content moderation keeps every conversation safe",
    color: "text-neon-green",
    glow: "neon-glow-green",
  },
  {
    icon: MessageCircle,
    title: "Instant Messaging",
    description:
      "Follow & chat with people you vibe with — text, voice, images & GIFs",
    color: "text-secondary",
    glow: "neon-glow-purple",
  },
  {
    icon: Users,
    title: "Build Your Network",
    description: "Discover people who share your interests from 190+ countries",
    color: "text-primary",
    glow: "neon-glow-blue",
  },
];

const stats = [
  { value: "10K+", label: "Users Online", icon: Zap },
  { value: "50M+", label: "Connections Made", icon: Wifi },
  { value: "190+", label: "Countries", icon: Globe },
];

/* ─── Floating Photo Mosaic ─── */
const floatingPhotos = [
  {
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    name: "Sophie",
    country: "France",
  },
  {
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    name: "James",
    country: "Australia",
  },
  {
    src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
    name: "Yuki",
    country: "Japan",
  },
  {
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
    name: "Carlos",
    country: "Brazil",
  },
  {
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
    name: "Aisha",
    country: "Nigeria",
  },
  {
    src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
    name: "Liam",
    country: "Ireland",
  },
  {
    src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
    name: "Priya",
    country: "India",
  },
  {
    src: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80",
    name: "Erik",
    country: "Sweden",
  },
  {
    src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80",
    name: "Mia",
    country: "USA",
  },
  {
    src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80",
    name: "Lin",
    country: "China",
  },
  {
    src: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=80",
    name: "Emma",
    country: "Germany",
  },
  {
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
    name: "Omar",
    country: "Egypt",
  },
];

/* Positions spread across the viewport — two loose columns on each side */
const photoPositions: { x: string; y: string; size: string; rotate: number }[] =
  [
    { x: "3%", y: "8%", size: "w-28 h-28 sm:w-36 sm:h-36", rotate: -6 },
    { x: "80%", y: "5%", size: "w-24 h-24 sm:w-32 sm:h-32", rotate: 4 },
    { x: "10%", y: "35%", size: "w-20 h-20 sm:w-28 sm:h-28", rotate: 3 },
    { x: "85%", y: "30%", size: "w-26 h-26 sm:w-34 sm:h-34", rotate: -5 },
    { x: "2%", y: "62%", size: "w-24 h-24 sm:w-32 sm:h-32", rotate: 5 },
    { x: "82%", y: "58%", size: "w-22 h-22 sm:w-30 sm:h-30", rotate: -3 },
    { x: "7%", y: "85%", size: "w-20 h-20 sm:w-28 sm:h-28", rotate: -4 },
    { x: "78%", y: "82%", size: "w-24 h-24 sm:w-32 sm:h-32", rotate: 6 },
    { x: "18%", y: "15%", size: "w-16 h-16 sm:w-24 sm:h-24", rotate: 2 },
    { x: "72%", y: "18%", size: "w-18 h-18 sm:w-26 sm:h-26", rotate: -2 },
    { x: "16%", y: "52%", size: "w-16 h-16 sm:w-22 sm:h-22", rotate: 4 },
    { x: "75%", y: "48%", size: "w-18 h-18 sm:w-24 sm:h-24", rotate: -6 },
  ];

const FloatingPhoto = ({
  photo,
  pos,
  index,
}: {
  photo: (typeof floatingPhotos)[0];
  pos: (typeof photoPositions)[0];
  index: number;
}) => {
  return (
    <motion.div
      className="absolute z-0 pointer-events-none"
      style={{ left: pos.x, top: pos.y }}
      initial={{ opacity: 0, scale: 0.7, rotate: pos.rotate }}
      animate={{
        opacity: [0, 0.55, 0.55, 0],
        scale: [0.7, 1, 1, 0.85],
        y: [20, 0, -10, -25],
      }}
      transition={{
        duration: 8,
        delay: index * 1.2,
        repeat: Infinity,
        repeatDelay: floatingPhotos.length * 1.2 - 8 + 3,
        ease: "easeInOut",
      }}
    >
      <div
        className={`${pos.size} rounded-2xl overflow-hidden ring-2 ring-white/10 shadow-2xl shadow-primary/10`}
        style={{ transform: `rotate(${pos.rotate}deg)` }}
      >
        <img
          src={photo.src}
          alt={photo.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Gradient overlay with name */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-1.5 left-2 right-2">
          <p className="text-[10px] sm:text-xs font-semibold text-white truncate drop-shadow-lg">
            {photo.name}
          </p>
          <p className="text-[8px] sm:text-[10px] text-white/70">
            {photo.country}
          </p>
        </div>
        {/* Live dot */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[8px] text-white/80 font-medium">Live</span>
        </div>
      </div>
    </motion.div>
  );
};

const Landing = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParticleBackground />
      <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

      {/* Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Wifi className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold neon-text-blue text-primary">
            ConnectLive
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <>
              <Button
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold neon-glow-blue"
                asChild
              >
                <Link to="/stream">
                  Start Streaming <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Link to={`/profile/${user.username}`}>
                <Avatar className="w-9 h-9 ring-2 ring-primary/30">
                  <PrivateAvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground">
                    {(user.name || user.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold neon-glow-blue"
                asChild
              >
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero with Royal Floating Photo Background */}
      <HeroSection isAuthenticated={isAuthenticated} />

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-sm text-muted-foreground">
            <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            10,247 people streaming right now
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
            <span className="bg-gradient-to-r from-primary via-secondary to-neon-green bg-clip-text text-transparent animate-gradient">
              Meet Anyone.
            </span>
            <br />
            <span className="text-foreground">Anywhere. Instantly.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The next-generation stranger video platform with AI safety, smart
            matching, and a social experience unlike anything you've seen
            before.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg px-8 py-6 rounded-2xl neon-glow-blue hover:scale-105 transition-transform"
              asChild
            >
              <Link to={isAuthenticated ? "/stream" : "/register"}>
                Start Streaming <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border/50 text-muted-foreground hover:text-foreground px-8 py-6 rounded-2xl glass"
              asChild
            >
              <Link to="/explore">Explore Users</Link>
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <div className="flex flex-wrap justify-center gap-8 mt-20">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-2xl px-8 py-5 text-center min-w-[160px]"
              >
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-3xl font-bold text-foreground neon-text-blue">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Why ConnectLive?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Built different. Designed to be the safest & most immersive way to
            meet new people.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`glass rounded-2xl p-8 hover:scale-[1.02] transition-transform cursor-default group`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:${feature.glow} transition-shadow`}
              >
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 px-6 pb-12">
        <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-12">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            Ready to Connect?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of people discovering meaningful connections every
            day.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg px-10 py-6 rounded-2xl neon-glow-blue hover:scale-105 transition-transform"
            asChild
          >
            <Link to={isAuthenticated ? "/stream" : "/register"}>
              {isAuthenticated ? "Start Streaming" : "Get Started Free"}{" "}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/plans"
                    className="hover:text-foreground transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/explore"
                    className="hover:text-foreground transition-colors"
                  >
                    Explore
                  </Link>
                </li>
                <li>
                  <Link
                    to="/stream"
                    className="hover:text-foreground transition-colors"
                  >
                    Start Streaming
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-foreground transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-foreground transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/faq"
                    className="hover:text-foreground transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Safety</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/safety"
                    className="hover:text-foreground transition-colors"
                  >
                    Safety Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/community-guidelines"
                    className="hover:text-foreground transition-colors"
                  >
                    Community Guidelines
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookie-policy"
                    className="hover:text-foreground transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Wifi className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-display text-sm font-bold text-primary">
                ConnectLive
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ConnectLive. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
