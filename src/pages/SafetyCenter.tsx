import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Shield,
  Eye,
  Flag,
  Ban,
  Phone,
  Lock,
  AlertTriangle,
  Wifi,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ParticleBackground from "@/components/layout/ParticleBackground";

const features = [
  {
    icon: Eye,
    title: "Face Detection",
    description:
      "Our system ensures users show their face during video calls, preventing camera covering and maintaining authentic interactions.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Content Moderation",
    description:
      "AI-powered systems monitor for violations in real-time, automatically detecting and addressing inappropriate content.",
    color: "text-neon-green",
    bg: "bg-neon-green/10",
  },
  {
    icon: Flag,
    title: "Report System",
    description:
      "One-tap reporting lets you flag inappropriate behavior instantly. All reports are reviewed by our safety team within 24 hours.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Ban,
    title: "Block System",
    description:
      "Block any user to prevent future matches and messages. Blocked users cannot see your profile or contact you.",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description:
      "Video streams use WebRTC peer-to-peer technology with encryption, ensuring your conversations stay private.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: AlertTriangle,
    title: "Strike System",
    description:
      "Violations result in escalating consequences: warning → temporary ban → permanent ban. Severe violations mean instant removal.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
];

const tips = [
  "Never share personal information (address, phone, financial details) with strangers",
  "Trust your instincts — if something feels wrong, skip or end the call immediately",
  "Use the report and block buttons whenever you encounter inappropriate behavior",
  "Don't agree to meet strangers from the internet in person",
  "Keep your conversations on GlimseConnect where our safety features can protect you",
  "Don't click links shared by strangers — they could be malicious",
  "If you're under 18, this platform is not for you — please exit immediately",
  "Take breaks if conversations become stressful or overwhelming",
];

const SafetyCenter = () => {
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Hero */}
          <div className="glass rounded-3xl p-8 md:p-12 mb-8 text-center">
            <Shield className="w-16 h-16 text-neon-green mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Safety Center
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your safety is our{" "}
              <span className="text-neon-green font-semibold">
                top priority
              </span>
              . Learn about the tools and features we've built to protect you.
            </p>
          </div>

          {/* Safety Features */}
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Safety Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-6"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Safety Tips */}
          <div className="glass rounded-3xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Safety Tips
            </h2>
            <div className="space-y-3">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-muted-foreground text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How to Report */}
          <div className="glass rounded-3xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              How to Report
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/20 rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-primary mb-2">1</div>
                <p className="text-sm text-muted-foreground">
                  Click the <Flag className="w-4 h-4 inline text-primary" />{" "}
                  Report button during a stream or on a profile
                </p>
              </div>
              <div className="bg-muted/20 rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-primary mb-2">2</div>
                <p className="text-sm text-muted-foreground">
                  Select the reason for your report and add an optional
                  description
                </p>
              </div>
              <div className="bg-muted/20 rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-primary mb-2">3</div>
                <p className="text-sm text-muted-foreground">
                  Our safety team reviews every report within 24 hours and takes
                  appropriate action
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Resources */}
          <div className="glass rounded-3xl p-8 border border-destructive/20">
            <div className="flex items-center gap-3 mb-4">
              <Phone className="w-6 h-6 text-destructive" />
              <h2 className="text-2xl font-bold text-foreground">
                Emergency Resources
              </h2>
            </div>
            <p className="text-muted-foreground mb-4">
              If you or someone you know is in immediate danger, contact local
              emergency services.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-muted/10 rounded-xl p-4">
                <p className="font-semibold text-foreground text-sm">
                  Cyberbullying Helpline
                </p>
                <p className="text-muted-foreground text-xs">
                  stopbullying.gov
                </p>
              </div>
              <div className="bg-muted/10 rounded-xl p-4">
                <p className="font-semibold text-foreground text-sm">
                  Crisis Text Line
                </p>
                <p className="text-muted-foreground text-xs">
                  Text HOME to 741741
                </p>
              </div>
              <div className="bg-muted/10 rounded-xl p-4">
                <p className="font-semibold text-foreground text-sm">
                  NCMEC (Missing Children)
                </p>
                <p className="text-muted-foreground text-xs">1-800-843-5678</p>
              </div>
              <div className="bg-muted/10 rounded-xl p-4">
                <p className="font-semibold text-foreground text-sm">
                  National Suicide Prevention
                </p>
                <p className="text-muted-foreground text-xs">
                  988 Suicide & Crisis Lifeline
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="glass rounded-3xl p-8 mt-8 text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">
              Questions about safety?
            </h3>
            <p className="text-muted-foreground mb-4">
              Read our community guidelines or contact our safety team.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="outline"
                className="glass border-border/50 rounded-xl"
                asChild
              >
                <Link to="/community-guidelines">Community Guidelines</Link>
              </Button>
              <Button
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl neon-glow-blue"
                asChild
              >
                <Link to="/contact">
                  Contact Safety Team <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SafetyCenter;
