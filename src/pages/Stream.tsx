import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff,
  Filter, Signal, Clock, AlertTriangle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { countries } from "@/lib/countries";
import AppLayout from "@/components/layout/AppLayout";

type StreamState = "idle" | "searching" | "connected";

const Stream = () => {
  const [state, setState] = useState<StreamState>("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [timer, setTimer] = useState(0);

  const startSearching = () => {
    setState("searching");
    setTimeout(() => setState("connected"), 3000);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 gap-4">
        {/* Video Area */}
        <div className="flex-1 relative rounded-3xl overflow-hidden bg-muted/30 border border-border/30">
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6">
                  <Video className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Connect?</h2>
                <p className="text-muted-foreground mb-8 text-center max-w-sm">
                  Click below to start streaming and meet someone new from around the world
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="glass border-border/50 rounded-xl"
                  >
                    <Filter className="w-4 h-4 mr-2" /> Filters
                  </Button>
                  <Button
                    onClick={startSearching}
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold px-8 rounded-xl neon-glow-blue hover:scale-105 transition-transform"
                  >
                    Start Streaming
                  </Button>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="glass rounded-2xl p-6 mt-6 w-full max-w-md"
                    >
                      <h3 className="font-semibold text-foreground mb-4">Match Preferences</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">Country</label>
                          <Select>
                            <SelectTrigger className="bg-muted/50 border-border/50 rounded-xl">
                              <SelectValue placeholder="🌍 Global (Any country)" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border max-h-48">
                              <SelectItem value="global">🌍 Global</SelectItem>
                              {countries.map((c) => (
                                <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">Gender</label>
                          <Select>
                            <SelectTrigger className="bg-muted/50 border-border/50 rounded-xl">
                              <SelectValue placeholder="Any gender" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="any">Any</SelectItem>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {state === "searching" && (
              <motion.div
                key="searching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                {/* Radar animation */}
                <div className="relative w-48 h-48 mb-8">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border-2 border-primary/30"
                      animate={{ scale: [0.5, 2.5], opacity: [0.8, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                    />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center neon-glow-blue">
                      <Signal className="w-7 h-7 text-primary-foreground animate-pulse" />
                    </div>
                  </div>
                  {/* Sweep line */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
                    style={{ background: "linear-gradient(90deg, hsl(190 100% 50% / 0.6), transparent)" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2 neon-text-blue">Searching for a stranger...</h2>
                <p className="text-muted-foreground text-sm">Finding someone awesome for you</p>
                <Button variant="ghost" onClick={() => setState("idle")} className="mt-6 text-muted-foreground">
                  Cancel
                </Button>
              </motion.div>
            )}

            {state === "connected" && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0"
              >
                {/* Mock stranger video */}
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-card flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl">🇪🇸</span>
                    </div>
                    <p className="text-muted-foreground text-sm">Stranger's video feed</p>
                  </div>
                </div>

                {/* Top bar */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="glass text-foreground border-border/50">
                      <span className="w-2 h-2 bg-neon-green rounded-full mr-2 animate-pulse" />
                      Connected
                    </Badge>
                    <Badge className="glass text-muted-foreground border-border/50">
                      🇪🇸 Spain
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="glass text-muted-foreground border-border/50">
                      <Clock className="w-3 h-3 mr-1" /> 0:42
                    </Badge>
                    <Badge className="glass text-neon-green border-border/50">
                      <Signal className="w-3 h-3 mr-1" /> Good
                    </Badge>
                  </div>
                </div>

                {/* Self-view PiP */}
                <motion.div
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  className="absolute bottom-24 right-4 w-36 h-48 rounded-2xl bg-card border-2 border-primary/30 overflow-hidden shadow-lg cursor-grab active:cursor-grabbing"
                >
                  <div className="w-full h-full bg-gradient-to-br from-card to-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">Your camera</span>
                  </div>
                </motion.div>

                {/* Face detection warning (mock — hidden by default) */}
                {false && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20">
                    <div className="glass rounded-2xl p-8 text-center max-w-sm">
                      <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-foreground mb-2">Face Not Detected</h3>
                      <p className="text-muted-foreground mb-4">Please show your face to continue streaming</p>
                      <div className="text-4xl font-bold text-destructive neon-text-blue">8</div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {state === "connected" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMuted(!muted)}
              className={`w-14 h-14 rounded-2xl glass border-border/50 ${muted ? "text-destructive" : "text-foreground"}`}
            >
              {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCameraOn(!cameraOn)}
              className={`w-14 h-14 rounded-2xl glass border-border/50 ${!cameraOn ? "text-destructive" : "text-foreground"}`}
            >
              {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
            <Button
              onClick={() => { setState("searching"); setTimeout(() => setState("connected"), 2000); }}
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold neon-glow-blue hover:scale-105 transition-transform"
            >
              <SkipForward className="w-5 h-5 mr-2" /> Skip
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setState("idle")}
              className="w-14 h-14 rounded-2xl"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Stream;
