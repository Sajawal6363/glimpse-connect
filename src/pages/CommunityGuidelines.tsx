import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Heart,
  Shield,
  Eye,
  Ban,
  Flag,
  AlertTriangle,
  Users,
  Wifi,
  ArrowLeft,
} from "lucide-react";
import ParticleBackground from "@/components/layout/ParticleBackground";

const guidelines = [
  {
    icon: Heart,
    title: "Be Respectful",
    description:
      "Treat everyone with dignity and kindness. Respect cultural differences, personal boundaries, and diverse perspectives. A simple greeting goes a long way!",
    color: "text-neon-pink",
    bg: "bg-neon-pink/10",
  },
  {
    icon: Shield,
    title: "Keep It Safe",
    description:
      "No nudity, explicit content, drugs, weapons, or dangerous activities on stream. Keep your background appropriate. Safety is everyone's responsibility.",
    color: "text-neon-green",
    bg: "bg-neon-green/10",
  },
  {
    icon: Eye,
    title: "Be Authentic",
    description:
      "Show your real face during video calls. Don't use fake photos, pre-recorded videos, or impersonate someone else. Authenticity builds trust.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Ban,
    title: "No Harassment",
    description:
      "Zero tolerance for bullying, threats, stalking, doxxing, or any form of harassment. This includes unwanted sexual advances, hate speech, and discriminatory behavior.",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    icon: Users,
    title: "Protect Privacy",
    description:
      "Don't share others' personal information without consent. Don't screenshot or record streams without permission. Respect everyone's right to privacy.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Flag,
    title: "Report Bad Behavior",
    description:
      "If you encounter inappropriate behavior, use the report button immediately. All reports are reviewed by our safety team. You can also block users to prevent future contact.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

const consequences = [
  {
    step: "1st Violation",
    action: "Warning",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    step: "2nd Violation",
    action: "24-Hour Ban",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    step: "3rd Violation",
    action: "Permanent Ban",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
];

const CommunityGuidelines = () => {
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
          {/* Hero */}
          <div className="glass rounded-3xl p-8 mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Community Guidelines
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our mission is to create a{" "}
              <span className="text-primary font-semibold">
                safe, fun, and respectful
              </span>{" "}
              space where people from around the world can connect meaningfully.
              These guidelines help make that possible.
            </p>
          </div>

          {/* Guidelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {guidelines.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}
                >
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Consequences */}
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <h2 className="text-2xl font-bold text-foreground">
                Consequences
              </h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Violations of our guidelines result in escalating consequences:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {consequences.map((item) => (
                <div
                  key={item.step}
                  className={`${item.bg} rounded-2xl p-5 text-center`}
                >
                  <p className={`font-bold text-lg ${item.color}`}>
                    {item.step}
                  </p>
                  <p className="text-foreground font-semibold mt-1">
                    {item.action}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Severe violations (CSAM, threats of violence, illegal activity)
              result in{" "}
              <strong className="text-destructive">
                immediate permanent ban
              </strong>{" "}
              and may be reported to law enforcement.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CommunityGuidelines;
