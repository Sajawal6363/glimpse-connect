import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Check,
  Crown,
  Star,
  Zap,
  Wifi,
  ArrowLeft,
  X,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useToast } from "@/hooks/use-toast";
import ParticleBackground from "@/components/layout/ParticleBackground";

const Plans = () => {
  const [yearly, setYearly] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();
  const {
    planConfigs,
    currentPlan,
    subscription,
    startPremiumTrial,
    changePlan,
    isLoading,
  } = useSubscriptionStore();
  const [startingTrial, setStartingTrial] = useState(false);

  const order = useMemo(() => ["free", "premium", "vip"] as const, []);

  const plans = order.map((id) => {
    const config = planConfigs[id];
    return {
      id,
      name: config.name,
      price: config.monthlyPrice,
      yearlyPrice: config.yearlyPrice,
      description:
        id === "free"
          ? "Get started with limited features"
          : id === "premium"
            ? "Unlock the full ConnectLive experience"
            : "Elite visibility and social status",
      cta: id === "free" ? "Continue Free" : `Go ${config.name}`,
      badge: config.badge,
      style:
        id === "premium"
          ? "glass border-2 border-primary/50 neon-glow-blue"
          : id === "vip"
            ? "glass border-2 border-secondary/50"
            : "glass border-border/30",
      ctaStyle:
        id === "premium"
          ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground neon-glow-blue"
          : id === "vip"
            ? "bg-gradient-to-r from-secondary to-neon-pink text-primary-foreground"
            : "bg-muted/50 text-foreground hover:bg-muted",
      features: [
        id === "free"
          ? `Skips: ${config.entitlements.skipLimitPerHour ?? "Unlimited"}/hour`
          : "Unlimited skips & matching",
        id === "free"
          ? "Basic country filter"
          : "Advanced country + gender filter",
        id === "free"
          ? `Call limit: ${config.entitlements.maxCallDurationMinutes} min/session`
          : `Call limit: ${config.entitlements.maxCallDurationMinutes} min/session`,
        config.entitlements.adsEnabled ? "Ads enabled" : "Ad-free experience",
        config.entitlements.canSendMedia
          ? "Media + voice messages"
          : "Text-only messages",
        config.entitlements.canSeeProfileViewers
          ? "See who viewed your profile"
          : "Profile viewers locked",
      ],
      isCurrent: currentPlan === id,
      highlighted: config.highlighted,
    };
  });

  const comparisonRows = [
    {
      label: "Random matching",
      free: "Limited",
      premium: "Unlimited",
      vip: "Unlimited",
    },
    {
      label: "Skips / hour",
      free: String(planConfigs.free.entitlements.skipLimitPerHour ?? "—"),
      premium: "Unlimited",
      vip: "Unlimited",
    },
    {
      label: "Gender filter",
      free: false,
      premium: true,
      vip: true,
    },
    {
      label: "Country filters",
      free: "Basic only",
      premium: "All",
      vip: "All",
    },
    {
      label: "Text messages/day",
      free: String(planConfigs.free.entitlements.textMessagesPerDay ?? "—"),
      premium: "Unlimited",
      vip: "Unlimited",
    },
    {
      label: "Media sharing",
      free: false,
      premium: true,
      vip: true,
    },
    {
      label: "Message non-followers",
      free: false,
      premium: false,
      vip: true,
    },
    {
      label: "Call duration",
      free: `${planConfigs.free.entitlements.maxCallDurationMinutes} min`,
      premium: `${planConfigs.premium.entitlements.maxCallDurationMinutes} min`,
      vip: `${planConfigs.vip.entitlements.maxCallDurationMinutes} min`,
    },
    {
      label: "Badge",
      free: "—",
      premium: "✓ Verified",
      vip: "💎 VIP",
    },
    {
      label: "Profile boost",
      free: "1x",
      premium: "1x",
      vip: `${planConfigs.vip.entitlements.profileBoostMultiplier}x`,
    },
  ];

  const trialEligible = isAuthenticated && !subscription?.trialUsed;

  const handleStartTrial = async () => {
    if (!user?.id) return;
    setStartingTrial(true);
    try {
      await startPremiumTrial(user.id);
      toast({
        title: "3-day Premium trial activated",
        description: "Enjoy full Premium access for the next 72 hours.",
      });
    } catch (error) {
      toast({
        title: "Trial unavailable",
        description:
          error instanceof Error
            ? error.message
            : "Could not start trial right now.",
        variant: "destructive",
      });
    } finally {
      setStartingTrial(false);
    }
  };

  const handleDowngradeToFree = async () => {
    if (!user?.id) return;
    try {
      await changePlan(user.id, "free", "monthly");
      toast({
        title: "Plan downgraded",
        description: "Your account is now on the Free plan.",
      });
    } catch (error) {
      toast({
        title: "Could not downgrade",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

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
            Upgrade from Free to Premium or VIP and unlock faster matching,
            longer calls, ad-free video, and elite visibility.
          </p>

          {trialEligible && (
            <div className="mb-6">
              <Button
                onClick={handleStartTrial}
                disabled={startingTrial || isLoading}
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground"
              >
                {startingTrial
                  ? "Activating trial..."
                  : "Start 3-day Premium trial"}
              </Button>
            </div>
          )}

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
              key={plan.id}
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
                  {plan.id === "free" && (
                    <Zap className="w-6 h-6 text-muted-foreground" />
                  )}
                  {plan.id === "premium" && (
                    <Star className="w-6 h-6 text-primary" />
                  )}
                  {plan.id === "vip" && (
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
                    $
                    {yearly
                      ? plan.yearlyPrice.toFixed(2)
                      : plan.price.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.id === "free"
                      ? " forever"
                      : yearly
                        ? "/year"
                        : "/month"}
                  </span>
                </div>
                {plan.isCurrent && (
                  <p className="text-xs text-neon-green mt-2 font-semibold">
                    Your current plan
                  </p>
                )}
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
                asChild={
                  !(
                    plan.id === "free" &&
                    isAuthenticated &&
                    currentPlan !== "free"
                  )
                }
                onClick={
                  plan.id === "free" &&
                  isAuthenticated &&
                  currentPlan !== "free"
                    ? handleDowngradeToFree
                    : undefined
                }
              >
                {plan.id === "free" &&
                isAuthenticated &&
                currentPlan !== "free" ? (
                  <span>Downgrade to Free</span>
                ) : (
                  <Link
                    to={
                      plan.id === "free"
                        ? isAuthenticated
                          ? "/stream"
                          : "/register"
                        : isAuthenticated
                          ? `/checkout/${plan.id}`
                          : "/register"
                    }
                  >
                    {plan.isCurrent ? "Current plan" : plan.cta}
                  </Link>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-5xl mx-auto mt-10 glass rounded-3xl p-6"
        >
          <h3 className="text-xl font-bold text-foreground mb-4">
            Compare all plans
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 text-muted-foreground font-medium">
                    Feature
                  </th>
                  <th className="text-center py-3">Free</th>
                  <th className="text-center py-3 text-primary">Premium</th>
                  <th className="text-center py-3 text-secondary">VIP</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-border/20">
                    <td className="py-3 text-muted-foreground">{row.label}</td>
                    {(
                      [row.free, row.premium, row.vip] as Array<
                        string | boolean
                      >
                    ).map((value, idx) => (
                      <td
                        key={`${row.label}-${idx}`}
                        className="py-3 text-center"
                      >
                        {typeof value === "boolean" ? (
                          value ? (
                            <Check className="w-4 h-4 text-neon-green mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-destructive mx-auto" />
                          )
                        ) : value === "Locked" ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Lock className="w-3 h-3" /> {value}
                          </span>
                        ) : (
                          <span className="text-foreground">{value}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Plans;
