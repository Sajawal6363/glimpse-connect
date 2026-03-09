import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, Shield, MessageCircle, Users, Wifi, ArrowRight, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import ParticleBackground from "@/components/layout/ParticleBackground";

const features = [
  {
    icon: Video,
    title: "Live Video Streaming",
    description: "Connect with random strangers worldwide through crystal-clear HD video calls",
    color: "text-primary",
    glow: "neon-glow-blue",
  },
  {
    icon: Shield,
    title: "AI-Powered Safety",
    description: "Advanced face detection & content moderation keeps every conversation safe",
    color: "text-neon-green",
    glow: "neon-glow-green",
  },
  {
    icon: MessageCircle,
    title: "Instant Messaging",
    description: "Follow & chat with people you vibe with — text, voice, images & GIFs",
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

const Landing = () => {
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
          <span className="font-display text-xl font-bold neon-text-blue text-primary">ConnectLive</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold neon-glow-blue" asChild>
            <Link to="/register">Sign Up</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-5xl mx-auto">
        <motion.div
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
            The next-generation stranger video platform with AI safety, smart matching,
            and a social experience unlike anything you've seen before.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg px-8 py-6 rounded-2xl neon-glow-blue hover:scale-105 transition-transform"
              asChild
            >
              <Link to="/register">
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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-8 mt-20"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-2xl px-8 py-5 text-center min-w-[160px]">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground neon-text-blue">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
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
            Built different. Designed to be the safest & most immersive way to meet new people.
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
              <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:${feature.glow} transition-shadow`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-12">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            Ready to Connect?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of people discovering meaningful connections every day.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg px-10 py-6 rounded-2xl neon-glow-blue hover:scale-105 transition-transform"
            asChild
          >
            <Link to="/register">
              Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
