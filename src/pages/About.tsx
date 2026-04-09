import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Video,
  Shield,
  Users,
  Globe,
  ArrowRight,
  Wifi,
  ArrowLeft,
  Zap,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ParticleBackground from "@/components/layout/ParticleBackground";

const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "190+", label: "Countries" },
  { value: "50M+", label: "Connections Made" },
  { value: "4.8", label: "App Rating" },
];

const steps = [
  {
    icon: Users,
    title: "Sign Up",
    description:
      "Create your profile in under a minute. Add your interests and photos.",
  },
  {
    icon: Video,
    title: "Start Streaming",
    description:
      "Tap the stream button to connect with random strangers via live video.",
  },
  {
    icon: Heart,
    title: "Connect",
    description:
      "Follow people you vibe with, chat, and build meaningful friendships.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen relative">
      <ParticleBackground />
      <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
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

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            About{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              GlimseConnect
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The next-generation platform for meeting new people through live
            video — safe, fun, and designed to create real connections across
            the globe.
          </p>
        </motion.div>

        {/* Our Story */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Story</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            GlimseConnect was born from a simple idea: in a world where social
            media often feels performative and superficial, there's a need for
            genuine, spontaneous human connection.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We built GlimseConnect to be different — a platform where you can meet
            real people, have real conversations, and discover perspectives from
            around the world. No follower counts, no likes, no algorithms
            deciding what you see. Just face-to-face conversations that remind
            us of the beauty of human connection.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            With AI-powered safety features, smart matching, and a vibrant
            community, GlimseConnect is the safest and most immersive way to meet
            new people online.
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="glass rounded-2xl p-6 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-sm text-primary font-semibold mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Safety */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-3xl p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-neon-green" />
            <h2 className="text-2xl font-bold text-foreground">Safety First</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Your safety is our top priority. GlimseConnect employs multiple layers
            of protection:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Real-time face detection ensures authentic conversations",
              "AI-powered content moderation catches violations instantly",
              "One-tap reporting and blocking for user protection",
              "Strike system with escalating consequences",
              "18+ age verification requirement",
              "P2P encryption for all video streams",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-neon-green shrink-0 mt-1" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-foreground neon-text-blue">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-3xl p-8 text-center"
        >
          <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Ready to Connect?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join our global community today.
          </p>
          <Button
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold px-8 rounded-xl neon-glow-blue"
            asChild
          >
            <Link to="/register">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
