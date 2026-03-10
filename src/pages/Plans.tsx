import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Crown, Star, Zap, Wifi, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/useAuthStore";
import ParticleBackground from "@/components/layout/ParticleBackground";

const Plans = () => {
  const [yearly, setYearly] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Get started with basic features",
      features: [
        "Random video matching",
        "5 skips per hour",
        "Basic country filter",
        "Text chat with mutual followers",
        "5 interests max",
        "Ads shown",
        "Standard support",
      ],
      cta: "Get Started",
      style: "glass border-border/30",
      ctaStyle: "bg-muted/50 text-foreground hover:bg-muted",
      badge: null,
    },
    {
      name: "Premium",
      price: yearly ? "$79.99" : "$9.99",
      period: yearly ? "/year" : "/month",
      description: "Unlock the full ConnectLive experience",
      features: [
        "Unlimited skips",
        "All country filters",
        "Gender filter",
        "Interest-based matching",
        "Ad-free experience",
        "Priority matching",
        "HD video quality",
        "Unlimited interests",
        "Verified badge ✓",
        "Voice messages in chat",
        "See who viewed your profile",
        "Priority support",
      ],
      cta: "Go Premium",
      style: "glass border-2 border-primary/50 neon-glow-blue",
      ctaStyle:
        "bg-gradient-to-r from-primary to-secondary text-primary-foreground neon-glow-blue",
      badge: "Most Popular",
    },
    {
      name: "VIP",
      price: yearly ? "$149.99" : "$19.99",
      period: yearly ? "/year" : "/month",
      description: "The ultimate ConnectLive experience",
      features: [
        "Everything in Premium",
        "Custom profile themes",
        "Exclusive VIP badge 💎",
        "Invisible mode",
        "Advanced analytics",
        "Stream time stats",
        "Connection statistics",
        "Dedicated support",
      ],
      cta: "Go VIP",
      style: "glass border-2 border-secondary/50",
      ctaStyle:
        "bg-gradient-to-r from-secondary to-neon-pink text-primary-foreground",
      badge: "Exclusive",
    },
  ];

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />
      <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
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
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Plan
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Upgrade to unlock premium features and get the most out of
            ConnectLive.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-sm ${!yearly ? "text-foreground font-semibold" : "text-muted-foreground"}`}
            >
              Monthly
            </span>
            <Switch
              checked={yearly}
              onCheckedChange={setYearly}
              className="data-[state=checked]:bg-primary"
            />
            <span
              className={`text-sm ${yearly ? "text-foreground font-semibold" : "text-muted-foreground"}`}
            >
              Yearly{" "}
              <span className="text-neon-green text-xs font-bold">
                Save 33%
              </span>
            </span>
          </div>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${plan.style} rounded-3xl p-8 relative`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  {plan.name === "Free" && (
                    <Zap className="w-6 h-6 text-muted-foreground" />
                  )}
                  {plan.name === "Premium" && (
                    <Star className="w-6 h-6 text-primary" />
                  )}
                  {plan.name === "VIP" && (
                    <Crown className="w-6 h-6 text-secondary" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {plan.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-neon-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full h-12 rounded-xl font-bold ${plan.ctaStyle}`}
                asChild
              >
                <Link
                  to={
                    plan.name === "Free"
                      ? isAuthenticated
                        ? "/stream"
                        : "/register"
                      : isAuthenticated
                        ? `/checkout/${plan.name.toLowerCase()}`
                        : "/register"
                  }
                >
                  {plan.cta}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Plans;
