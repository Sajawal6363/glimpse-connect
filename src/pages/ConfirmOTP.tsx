import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Mail, ShieldCheck, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import ParticleBackground from "@/components/layout/ParticleBackground";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

type OTPType = "magiclink" | "signup" | "recovery";

const ConfirmOTP = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { checkAuth, clearEmailConfirmation } = useAuthStore();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const email = searchParams.get("email") || "";
  const typeParam = searchParams.get("type");
  const type: OTPType =
    typeParam === "signup" || typeParam === "recovery"
      ? typeParam
      : "magiclink";

  const verifyOtp = async () => {
    if (!email) {
      toast({
        title: "Missing email",
        description: "Please go back and try again.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Enter the 6-digit code from your inbox.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type,
      });

      if (error) throw error;

      if (type === "recovery") {
        navigate("/login");
        return;
      }

      await checkAuth();
      clearEmailConfirmation();

      toast({ title: "Verified", description: "Your account is ready." });
      navigate("/stream");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not verify OTP";
      toast({ title: "Verification failed", description: message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      if (type === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      } else if (type === "signup") {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        if (error) throw error;
      }

      toast({ title: "Code sent", description: "Check your inbox for a new OTP." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not resend code";
      toast({ title: "Resend failed", description: message, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 py-8">
      <ParticleBackground />
      <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="glass rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-neon-green" />

          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Wifi className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold neon-text-blue text-primary">GlimseConnect</span>
          </div>

          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-8 ring-4 ring-primary/10">
            <Mail className="w-12 h-12 text-primary" />
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-2 font-display">Confirm OTP</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Enter the 6-digit code sent to
          </p>
          <div className="glass rounded-xl px-5 py-3 inline-flex items-center gap-2 mb-8">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-foreground font-semibold text-sm">{email || "your email"}</span>
          </div>

          <div className="flex justify-center mb-8">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="glass rounded-xl p-4 mb-8 text-sm text-muted-foreground inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Use the latest OTP only. It expires shortly for security.</span>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={verifyOtp}
              disabled={isVerifying}
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl px-6 py-6 font-semibold neon-glow-blue"
            >
              {isVerifying ? "Verifying..." : "Verify & Continue"}
            </Button>

            <Button
              variant="outline"
              onClick={resendOtp}
              disabled={isResending}
              className="rounded-xl glass border-border/50 px-6"
            >
              {isResending ? "Sending..." : "Resend OTP"}
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate(type === "signup" ? "/register" : "/login")}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Need help? <Link to="/contact" className="text-primary hover:underline">Contact support</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmOTP;
