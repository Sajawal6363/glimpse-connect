import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useCallback } from "react";
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

/* ─── Connection Lines SVG ─── */
const connectionPairs = [
  [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [8, 10], [9, 11], [0, 8], [1, 9],
];

const ConnectionLines = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" aria-hidden="true">
    <defs>
      <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(190 100% 50% / 0.15)" />
        <stop offset="50%" stopColor="hsl(270 80% 62% / 0.2)" />
        <stop offset="100%" stopColor="hsl(190 100% 50% / 0.1)" />
      </linearGradient>
    </defs>
    {connectionPairs.map(([a, b], i) => {
      const pA = photoPositions[a];
      const pB = photoPositions[b];
      return (
        <motion.line
          key={i}
          x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y}
          stroke="url(#line-grad)"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.4, 0.4, 0] }}
          transition={{ duration: 6, delay: i * 0.8, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
        />
      );
    })}
  </svg>
);

/* ─── Royal Floating Photo Card ─── */
const FloatingPhoto = ({
  photo,
  pos,
  index,
  mouseX,
  mouseY,
}: {
  photo: (typeof floatingPhotos)[0];
  pos: (typeof photoPositions)[0];
  index: number;
  mouseX: ReturnType<typeof useMotionValue>;
  mouseY: ReturnType<typeof useMotionValue>;
}) => {
  const depth = 0.5 + (index % 4) * 0.15;
  const parallaxX = useTransform(mouseX, [0, 1], [-12 * depth, 12 * depth]);
  const parallaxY = useTransform(mouseY, [0, 1], [-8 * depth, 8 * depth]);
  const floatDuration = 3.5 + (index % 5) * 0.6;
  const breathDuration = 4 + (index % 3) * 0.8;

  return (
    <motion.div
      className="absolute z-0"
      style={{ left: pos.x, top: pos.y, x: parallaxX, y: parallaxY, perspective: 800 }}
      initial={{ opacity: 0, scale: 0, rotate: pos.rotate + 15, filter: "blur(12px)" }}
      animate={{
        opacity: [0, 0.7, 0.7, 0],
        scale: [0, 1.05, 1, 0.9],
        rotate: [pos.rotate + 15, pos.rotate, pos.rotate - 2, pos.rotate],
        filter: ["blur(12px)", "blur(0px)", "blur(0px)", "blur(6px)"],
      }}
      transition={{
        duration: 10,
        delay: index * 0.9,
        repeat: Infinity,
        repeatDelay: Math.max(0, floatingPhotos.length * 0.9 - 10 + 2),
        ease: "easeInOut",
      }}
    >
      <motion.div
        animate={{
          y: [-6, 6, -6],
          rotateX: [-2, 3, -2],
          rotateY: [2, -3, 2],
          scale: [0.97, 1.03, 0.97],
        }}
        transition={{
          y: { duration: floatDuration, repeat: Infinity, ease: "easeInOut" },
          rotateX: { duration: floatDuration + 0.5, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: floatDuration + 1, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: breathDuration, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className={`${pos.size} rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 royal-card-glow relative`}
          style={{ transform: `rotate(${pos.rotate}deg)` }}
        >
          <div className="absolute inset-0 z-20 pointer-events-none royal-shimmer-sweep" />
          <div className="absolute inset-0 z-10 rounded-2xl royal-neon-ring pointer-events-none" />
          <img src={photo.src} alt={photo.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-[5]" />
          <div className="absolute bottom-1.5 left-2 right-2 z-[6]">
            <p className="text-[10px] sm:text-xs font-semibold text-white truncate drop-shadow-lg">{photo.name}</p>
            <p className="text-[8px] sm:text-[10px] text-white/70">{photo.country}</p>
          </div>
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 z-[6]">
            <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
            <span className="text-[8px] text-white/80 font-medium">Live</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Hero Section with Royal Floating Cards ─── */
const HeroSection = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <section
      ref={containerRef}
      className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-5xl mx-auto min-h-[90vh]"
    >
      {/* Royal floating photos behind hero content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <ConnectionLines />
        {floatingPhotos.map((photo, i) => (
          <FloatingPhoto
            key={photo.name}
            photo={photo}
            pos={photoPositions[i]}
            index={i}
            mouseX={mouseX}
            mouseY={mouseY}
          />
        ))}
        {/* Center vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 60% at 50% 45%, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.6) 55%, transparent 100%)",
          }}
        />
      </div>

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
          matching, and a social experience unlike anything you've seen before.
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

      <HeroSection isAuthenticated={isAuthenticated} />

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
