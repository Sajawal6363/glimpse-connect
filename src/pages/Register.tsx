import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  Mail,
  Lock,
  User,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  Camera,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { countries } from "@/lib/countries";
import { interests } from "@/lib/interests";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerStep1Schema,
  registerStep2Schema,
  registerStep3Schema,
  type RegisterStep1Data,
  type RegisterStep2Data,
} from "@/lib/validators";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import ParticleBackground from "@/components/layout/ParticleBackground";
import { useEffect } from "react";

const stepLabels = ["Account", "Profile", "Interests"];

const Register = () => {
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const {
    register: registerUser,
    needsEmailConfirmation,
    pendingEmail,
    clearEmailConfirmation,
  } = useAuthStore();
  const { toast } = useToast();

  // Step 1 form
  const step1Form = useForm<RegisterStep1Data>({
    resolver: zodResolver(registerStep1Schema),
    mode: "onBlur",
  });
  // Step 2 form
  const step2Form = useForm<RegisterStep2Data>({
    resolver: zodResolver(registerStep2Schema),
    mode: "onBlur",
  });

  const watchedUsername = step1Form.watch("username");
  const debouncedUsername = useDebounce(watchedUsername, 500);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      setCheckingUsername(true);
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", debouncedUsername)
        .maybeSingle();
      setUsernameAvailable(!data);
      setCheckingUsername(false);
    };
    checkUsername();
  }, [debouncedUsername]);

  useEffect(() => {
    if (!needsEmailConfirmation) return;
    const email = pendingEmail
      ? `?email=${encodeURIComponent(pendingEmail)}`
      : "";
    navigate(`/confirm-email${email}`);
  }, [needsEmailConfirmation, pendingEmail, navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        toast({ title: "Image must be less than 1MB", variant: "destructive" });
        e.target.value = "";
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
          ? [...prev, interest]
          : prev,
    );
  };

  const nextStep = async () => {
    if (step === 0) {
      const valid = await step1Form.trigger();
      if (!valid || usernameAvailable === false) return;
      setStep(1);
    } else if (step === 1) {
      const valid = await step2Form.trigger();
      if (!valid) return;
      setStep(2);
    }
  };

  const handleComplete = async () => {
    if (selectedInterests.length < 3) {
      toast({
        title: "Select interests",
        description: "Please select at least 3 interests.",
        variant: "destructive",
      });
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      toast({
        title: "Agreements required",
        description: "Please agree to Terms and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const step1Data = step1Form.getValues();
      const step2Data = step2Form.getValues();
      const selectedCountry = countries.find(
        (c) => c.code === step2Data.country,
      );

      // Register the user first (creates auth user + profile + session)
      // Pass avatarFile so it's uploaded with an active session
      await registerUser({
        email: step1Data.email,
        password: step1Data.password,
        username: step1Data.username,
        name: step2Data.name,
        dateOfBirth: step2Data.dateOfBirth,
        gender: step2Data.gender,
        country: selectedCountry?.name || step2Data.country,
        countryCode: step2Data.country,
        bio: step2Data.bio,
        interests: selectedInterests,
        avatarFile: avatarFile,
      });

      // Avatar is now uploaded inside registerUser, no need for separate upload

      // Check if email confirmation is required
      const currentState = useAuthStore.getState();
      if (currentState.needsEmailConfirmation) {
        const email = currentState.pendingEmail || step1Data.email;
        navigate(`/confirm-email?email=${encodeURIComponent(email)}`);
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Account created!",
        description: "Welcome to ConnectLive.",
      });
      navigate("/stream");
    } catch (err: unknown) {
      // If email confirmation was triggered inside register(), don't show error toast
      const currentState = useAuthStore.getState();
      if (currentState.needsEmailConfirmation) {
        const email = currentState.pendingEmail || step1Form.getValues("email");
        navigate(`/confirm-email?email=${encodeURIComponent(email)}`);
        setIsSubmitting(false);
        return;
      }
      const message =
        err instanceof Error ? err.message : "Registration failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 py-8">
      <ParticleBackground />
      <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

      {/* Email Confirmation Screen — Professional */}
      {needsEmailConfirmation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg relative z-10"
        >
          <div className="glass rounded-3xl p-10 text-center relative overflow-hidden">
            {/* Decorative gradient top bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-neon-green" />

            {/* Animated email icon */}
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
              We've sent a verification link to
            </p>
            <div className="glass rounded-xl px-5 py-3 inline-flex items-center gap-2 mb-8">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-foreground font-semibold text-sm">
                {pendingEmail}
              </span>
            </div>

            {/* Steps */}
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
                  Come back here and{" "}
                  <strong className="text-foreground">log in</strong> to start
                  streaming
                </p>
              </div>
            </div>

            <div className="glass rounded-xl p-4 mb-8 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Didn't receive it?</strong>{" "}
                Check your spam or junk folder. The email may take a few minutes
                to arrive.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  clearEmailConfirmation();
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
          </div>
        </motion.div>
      )}

      {/* Registration Form */}
      {!needsEmailConfirmation && (
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
            <span className="font-display text-xl font-bold neon-text-blue text-primary">
              ConnectLive
            </span>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {stepLabels.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i <= step
                        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground neon-glow-blue"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-sm hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {s}
                  </span>
                  {i < stepLabels.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
                  )}
                </div>
              ))}
            </div>
            <Progress
              value={((step + 1) / stepLabels.length) * 100}
              className="h-1 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-secondary"
            />
          </div>

          <div className="glass rounded-3xl p-8">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Create Account
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Start your journey
                  </p>
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...step1Form.register("email")}
                        placeholder="Email address"
                        type="email"
                        className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl"
                      />
                    </div>
                    {step1Form.formState.errors.email && (
                      <p className="text-destructive text-xs mt-1">
                        {step1Form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...step1Form.register("username")}
                        placeholder="Username"
                        className="pl-11 pr-10 h-12 bg-muted/50 border-border/50 rounded-xl"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername && (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                        {!checkingUsername && usernameAvailable === true && (
                          <CheckCircle className="w-4 h-4 text-neon-green" />
                        )}
                        {!checkingUsername && usernameAvailable === false && (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    {step1Form.formState.errors.username && (
                      <p className="text-destructive text-xs mt-1">
                        {step1Form.formState.errors.username.message}
                      </p>
                    )}
                    {usernameAvailable === false && (
                      <p className="text-destructive text-xs mt-1">
                        Username is already taken
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...step1Form.register("password")}
                        placeholder="Password"
                        type="password"
                        className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl"
                      />
                    </div>
                    {step1Form.formState.errors.password && (
                      <p className="text-destructive text-xs mt-1">
                        {step1Form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...step1Form.register("confirmPassword")}
                        placeholder="Confirm Password"
                        type="password"
                        className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl"
                      />
                    </div>
                    {step1Form.formState.errors.confirmPassword && (
                      <p className="text-destructive text-xs mt-1">
                        {step1Form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Your Profile
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Tell us about yourself
                  </p>

                  {/* Avatar upload */}
                  <div className="flex justify-center mb-4">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileRef.current?.click()}
                    >
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center ring-4 ring-primary/20 group-hover:ring-primary/50 transition-all overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                        <span className="text-lg">+</span>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      {...step2Form.register("name")}
                      placeholder="Full Name"
                      className="h-12 bg-muted/50 border-border/50 rounded-xl"
                    />
                    {step2Form.formState.errors.name && (
                      <p className="text-destructive text-xs mt-1">
                        {step2Form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...step2Form.register("dateOfBirth")}
                        placeholder="Date of Birth"
                        type="date"
                        className="pl-11 h-12 bg-muted/50 border-border/50 rounded-xl"
                      />
                    </div>
                    {step2Form.formState.errors.dateOfBirth && (
                      <p className="text-destructive text-xs mt-1">
                        {step2Form.formState.errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Select
                      onValueChange={(val) =>
                        step2Form.setValue(
                          "gender",
                          val as RegisterStep2Data["gender"],
                          { shouldValidate: true },
                        )
                      }
                    >
                      <SelectTrigger className="h-12 bg-muted/50 border-border/50 rounded-xl">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {step2Form.formState.errors.gender && (
                      <p className="text-destructive text-xs mt-1">
                        {step2Form.formState.errors.gender.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Select
                      onValueChange={(val) =>
                        step2Form.setValue("country", val, {
                          shouldValidate: true,
                        })
                      }
                    >
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
                    {step2Form.formState.errors.country && (
                      <p className="text-destructive text-xs mt-1">
                        {step2Form.formState.errors.country.message}
                      </p>
                    )}
                  </div>
                  <Input
                    {...step2Form.register("bio")}
                    placeholder="Short bio (optional)"
                    className="h-12 bg-muted/50 border-border/50 rounded-xl"
                  />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Your Interests
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Pick 3–5 topics you love ({selectedInterests.length}/5)
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {interests.map((interest) => (
                      <Badge
                        key={interest}
                        variant={
                          selectedInterests.includes(interest)
                            ? "default"
                            : "outline"
                        }
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

                  {/* Agreements */}
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={agreeTerms}
                        onCheckedChange={(v) => setAgreeTerms(!!v)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-muted-foreground">
                        I agree to the{" "}
                        <Link
                          to="/terms"
                          className="text-primary hover:underline"
                        >
                          Terms of Service
                        </Link>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={agreePrivacy}
                        onCheckedChange={(v) => setAgreePrivacy(!!v)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-muted-foreground">
                        I agree to the{" "}
                        <Link
                          to="/privacy"
                          className="text-primary hover:underline"
                        >
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              {step > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              ) : (
                <div />
              )}
              {step < stepLabels.length - 1 ? (
                <Button
                  onClick={nextStep}
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl neon-glow-blue px-8"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl neon-glow-blue px-8"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Complete Setup <Check className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>

            {step === 0 && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Log In
                </Link>
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Register;
