import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Mail, Wifi } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ParticleBackground from "@/components/layout/ParticleBackground";
import { useAuthStore } from "@/stores/useAuthStore";

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pendingEmail, clearEmailConfirmation } = useAuthStore();

  const emailFromQuery = searchParams.get("email");
  const email = pendingEmail || emailFromQuery || "your email address";

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
            <span className="font-display text-xl font-bold neon-text-blue text-primary">
              ConnectLive
            </span>
          </div>

          <motion.div
            initial={{ y: -10 }}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-8 ring-4 ring-primary/10"
          >
            <Mail className="w-12 h-12 text-primary" />
          </motion.div>

          <h2 className="text-3xl font-bold text-foreground mb-2 font-display">
            Check Your Inbox
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto">
            We&apos;ve sent a verification link to
          </p>
          <div className="glass rounded-xl px-5 py-3 inline-flex items-center gap-2 mb-8">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-foreground font-semibold text-sm">
              {email}
            </span>
          </div>

          <div className="glass rounded-2xl p-5 mb-8 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary text-xs font-bold">1</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Open the email from{" "}
                <strong className="text-foreground">ConnectLive</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary text-xs font-bold">2</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the{" "}
                <strong className="text-foreground">confirmation link</strong>{" "}
                in the email
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary text-xs font-bold">3</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Come back and{" "}
                <strong className="text-foreground">log in</strong> to start
                streaming
              </p>
            </div>
          </div>

          <div className="glass rounded-xl p-4 mb-8 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">
                Didn&apos;t receive it?
              </strong>{" "}
              Check your spam or junk folder. The email may take a few minutes
              to arrive.
            </p>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                clearEmailConfirmation();
                navigate("/register");
              }}
              className="rounded-xl glass border-border/50 px-6"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Register
            </Button>
            <Button
              onClick={() => {
                clearEmailConfirmation();
                navigate("/login");
              }}
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl px-6 font-semibold neon-glow-blue"
            >
              Go to Login
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Wrong email?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Create account again
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmEmail;
