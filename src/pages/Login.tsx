import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wifi, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ParticleBackground from "@/components/layout/ParticleBackground";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4">
      <ParticleBackground />
      <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Wifi className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold neon-text-blue text-primary">ConnectLive</span>
        </div>

        <div className="glass rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-center mb-8">Log in to start streaming</p>

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Email address" type="email" className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                className="pl-11 pr-11 h-12 bg-muted/50 border-border/50 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex justify-end">
              <button className="text-sm text-primary hover:underline">Forgot password?</button>
            </div>

            <Button className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl neon-glow-blue text-base">
              Log In
            </Button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs text-muted-foreground uppercase">or continue with</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["Google", "Facebook", "Apple"].map((provider) => (
              <Button key={provider} variant="outline" className="h-12 glass border-border/50 rounded-xl text-sm text-muted-foreground hover:text-foreground">
                {provider}
              </Button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">Sign Up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
