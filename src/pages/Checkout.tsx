import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wifi,
  CreditCard,
  Lock,
  Check,
  Loader2,
  Shield,
  Star,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useToast } from "@/hooks/use-toast";
import ParticleBackground from "@/components/layout/ParticleBackground";

const planDetails: Record<
  string,
  {
    name: string;
    icon: typeof Star;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
  }
> = {
  premium: {
    name: "Premium",
    icon: Star,
    monthlyPrice: 9.99,
    yearlyPrice: 79.99,
    features: [
      "Unlimited skips",
      "All country & gender filters",
      "Interest-based matching",
      "Ad-free experience",
      "Priority matching",
      "HD video quality",
      "Verified badge ✓",
      "Priority support",
    ],
  },
  vip: {
    name: "VIP",
    icon: Crown,
    monthlyPrice: 19.99,
    yearlyPrice: 149.99,
    features: [
      "Everything in Premium",
      "Custom profile themes",
      "Exclusive VIP badge 💎",
      "Invisible mode",
      "Advanced analytics",
      "Dedicated support",
    ],
  },
};

const Checkout = () => {
  const { plan: planId } = useParams<{ plan: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { changePlan, subscription } = useSubscriptionStore();
  const { toast } = useToast();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  const plan = planDetails[planId || ""] || planDetails.premium;
  const price =
    billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const PlanIcon = plan.icon;

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 16);
    const groups = v.match(/.{1,4}/g);
    return groups ? groups.join(" ") : v;
  };

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 4);
    if (v.length > 2) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === "card") {
      const rawCard = cardNumber.replace(/\s/g, "");
      if (rawCard.length < 16) {
        toast({
          title: "Invalid card number",
          description: "Please enter a valid 16-digit card number.",
          variant: "destructive",
        });
        return;
      }
      if (cardExpiry.length < 5) {
        toast({
          title: "Invalid expiry",
          description: "Please enter a valid expiry date (MM/YY).",
          variant: "destructive",
        });
        return;
      }
      if (cardCvc.length < 3) {
        toast({
          title: "Invalid CVC",
          description: "Please enter a valid CVC code.",
          variant: "destructive",
        });
        return;
      }
      if (!cardName.trim()) {
        toast({
          title: "Name required",
          description: "Please enter the name on your card.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2500));

    if (user?.id) {
      await changePlan(
        user.id,
        (planId === "vip" ? "vip" : "premium") as "premium" | "vip",
        billingCycle,
      );
    }

    toast({
      title: "🎉 Payment Successful!",
      description: `You're now a ${plan.name} member. Enjoy your premium features!`,
    });

    setIsProcessing(false);
    navigate("/stream");
  };

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />
      <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/plans"
            className="text-muted-foreground hover:text-foreground"
          >
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left — Payment Form */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Checkout
              </h1>
              <p className="text-muted-foreground mb-8">
                Complete your purchase to unlock {plan.name} features.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Billing Cycle */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Billing Cycle
                  </h3>
                  <RadioGroup
                    value={billingCycle}
                    onValueChange={(v) =>
                      setBillingCycle(v as "monthly" | "yearly")
                    }
                    className="grid grid-cols-2 gap-4"
                  >
                    <Label
                      htmlFor="monthly"
                      className={`glass rounded-xl p-4 cursor-pointer transition-all ${
                        billingCycle === "monthly"
                          ? "ring-2 ring-primary neon-glow-blue"
                          : "border border-border/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <div>
                          <p className="font-semibold text-foreground">
                            Monthly
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${plan.monthlyPrice}/month
                          </p>
                        </div>
                      </div>
                    </Label>
                    <Label
                      htmlFor="yearly"
                      className={`glass rounded-xl p-4 cursor-pointer transition-all relative ${
                        billingCycle === "yearly"
                          ? "ring-2 ring-primary neon-glow-blue"
                          : "border border-border/30"
                      }`}
                    >
                      <div className="absolute -top-2 right-3">
                        <span className="bg-neon-green text-background text-xs font-bold px-2 py-0.5 rounded-full">
                          Save 33%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="yearly" id="yearly" />
                        <div>
                          <p className="font-semibold text-foreground">
                            Yearly
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${plan.yearlyPrice}/year
                          </p>
                        </div>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {/* Payment Method */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Payment Method
                  </h3>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="space-y-3 mb-6"
                  >
                    <Label
                      htmlFor="card"
                      className={`flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-all ${
                        paymentMethod === "card"
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <RadioGroupItem value="card" id="card" />
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="text-foreground text-sm font-medium">
                        Credit / Debit Card
                      </span>
                    </Label>
                    <Label
                      htmlFor="paypal"
                      className={`flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-all ${
                        paymentMethod === "paypal"
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <RadioGroupItem value="paypal" id="paypal" />
                      <span className="text-[#0070BA] font-bold text-lg">
                        P
                      </span>
                      <span className="text-foreground text-sm font-medium">
                        PayPal
                      </span>
                    </Label>
                  </RadioGroup>

                  {paymentMethod === "card" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4"
                    >
                      <div>
                        <Label
                          htmlFor="cardName"
                          className="text-sm text-muted-foreground mb-2 block"
                        >
                          Name on Card
                        </Label>
                        <Input
                          id="cardName"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="John Doe"
                          className="h-12 bg-muted/30 border-border/30 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="cardNumber"
                          className="text-sm text-muted-foreground mb-2 block"
                        >
                          Card Number
                        </Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="cardNumber"
                            value={cardNumber}
                            onChange={(e) =>
                              setCardNumber(formatCardNumber(e.target.value))
                            }
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            className="pl-11 h-12 bg-muted/30 border-border/30 rounded-xl font-mono tracking-wider"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label
                            htmlFor="cardExpiry"
                            className="text-sm text-muted-foreground mb-2 block"
                          >
                            Expiry Date
                          </Label>
                          <Input
                            id="cardExpiry"
                            value={cardExpiry}
                            onChange={(e) =>
                              setCardExpiry(formatExpiry(e.target.value))
                            }
                            placeholder="MM/YY"
                            maxLength={5}
                            className="h-12 bg-muted/30 border-border/30 rounded-xl font-mono"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="cardCvc"
                            className="text-sm text-muted-foreground mb-2 block"
                          >
                            CVC
                          </Label>
                          <Input
                            id="cardCvc"
                            value={cardCvc}
                            onChange={(e) =>
                              setCardCvc(
                                e.target.value.replace(/\D/g, "").slice(0, 4),
                              )
                            }
                            placeholder="123"
                            maxLength={4}
                            className="h-12 bg-muted/30 border-border/30 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {paymentMethod === "paypal" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="glass rounded-xl p-4 text-center text-sm text-muted-foreground"
                    >
                      You'll be redirected to PayPal to complete your payment
                      securely.
                    </motion.div>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg neon-glow-blue hover:scale-[1.02] transition-transform"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay ${price.toFixed(2)}{" "}
                      {billingCycle === "yearly" ? "/year" : "/month"}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>
                    Secured by 256-bit SSL encryption. Cancel anytime.
                  </span>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Right — Order Summary */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6 sticky top-8"
            >
              <h3 className="font-semibold text-foreground mb-4">
                Order Summary
              </h3>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <PlanIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">
                    ConnectLive {plan.name}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {billingCycle} billing
                  </p>
                </div>
              </div>

              <Separator className="bg-border/30 mb-4" />

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-neon-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Separator className="bg-border/30 mb-4" />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">$0.00</span>
                </div>
                <Separator className="bg-border/30" />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    ${price.toFixed(2)}
                  </span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-xs text-neon-green text-center mt-2">
                    You save $
                    {(plan.monthlyPrice * 12 - plan.yearlyPrice).toFixed(2)}
                    /year!
                  </p>
                )}
              </div>

              {user && (
                <div className="mt-6 glass rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">
                    Billing to:{" "}
                    <span className="text-foreground font-medium">
                      {user.email}
                    </span>
                  </p>
                  {subscription && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current subscription status: {subscription.status}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
