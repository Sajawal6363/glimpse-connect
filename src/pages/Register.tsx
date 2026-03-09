import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Mail, Lock, User, Calendar, ChevronRight, ChevronLeft, Check, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { countries } from "@/lib/countries";
import { interests } from "@/lib/interests";
import ParticleBackground from "@/components/layout/ParticleBackground";

const steps = ["Account", "Profile", "Interests"];

const Register = () => {
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : prev.length < 10 ? [...prev, interest] : prev
    );
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
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Wifi className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold neon-text-blue text-primary">ConnectLive</span>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i <= step ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground neon-glow-blue" : "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />}
              </div>
            ))}
          </div>
          <Progress value={((step + 1) / steps.length) * 100} className="h-1 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-secondary" />
        </div>

        <div className="glass rounded-3xl p-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-1">Create Account</h2>
                <p className="text-muted-foreground mb-6">Start your journey</p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="Email address" type="email" className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl" />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="Username" className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="Password" type="password" className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="Confirm Password" type="password" className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl" />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-1">Your Profile</h2>
                <p className="text-muted-foreground mb-6">Tell us about yourself</p>

                {/* Avatar upload */}
                <div className="flex justify-center mb-4">
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center ring-4 ring-primary/20 group-hover:ring-primary/50 transition-all">
                      <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                      <span className="text-lg">+</span>
                    </div>
                  </div>
                </div>

                <Input placeholder="Full Name" className="h-12 bg-muted/50 border-border/50 rounded-xl" />
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="Date of Birth" type="date" className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl" />
                </div>
                <Select>
                  <SelectTrigger className="h-12 bg-muted/50 border-border/50 rounded-xl">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="h-12 bg-muted/50 border-border/50 rounded-xl">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-60">
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Short bio (optional)" className="h-12 bg-muted/50 border-border/50 rounded-xl" />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-bold text-foreground mb-1">Your Interests</h2>
                <p className="text-muted-foreground mb-6">Pick up to 10 topics you love ({selectedInterests.length}/10)</p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant={selectedInterests.includes(interest) ? "default" : "outline"}
                      className={`cursor-pointer px-4 py-2 rounded-full text-sm transition-all ${
                        selectedInterests.includes(interest)
                          ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground neon-glow-blue border-transparent"
                          : "border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="text-muted-foreground">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl neon-glow-blue px-8">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl neon-glow-blue px-8" asChild>
                <Link to="/stream">Complete Setup <Check className="w-4 h-4 ml-1" /></Link>
              </Button>
            )}
          </div>

          {step === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Log In</Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
