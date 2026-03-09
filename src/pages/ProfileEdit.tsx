import { motion } from "framer-motion";
import { Camera, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { countries } from "@/lib/countries";
import { interests } from "@/lib/interests";
import AppLayout from "@/components/layout/AppLayout";
import { useState } from "react";

const ProfileEdit = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Travel", "Music", "Photography"]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : prev.length < 10 ? [...prev, interest] : prev
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-6">Edit Profile</h1>

          <div className="glass rounded-3xl p-8 space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative group cursor-pointer">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-primary-foreground ring-4 ring-primary/20 group-hover:ring-primary/50 transition-all">
                  S
                </div>
                <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-foreground" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Full Name</label>
                <Input defaultValue="Sofia Rivera" className="h-12 bg-muted/30 border-border/30 rounded-xl" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Username</label>
                <Input defaultValue="sofiaR" className="h-12 bg-muted/30 border-border/30 rounded-xl" />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Bio</label>
              <Textarea defaultValue="Travel addict & music lover ✈️🎵" className="bg-muted/30 border-border/30 rounded-xl resize-none" rows={3} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Gender</label>
                <Select defaultValue="female">
                  <SelectTrigger className="h-12 bg-muted/30 border-border/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Country</label>
                <Select defaultValue="ES">
                  <SelectTrigger className="h-12 bg-muted/30 border-border/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-60">
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-3 block">Interests ({selectedInterests.length}/10)</label>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant={selectedInterests.includes(interest) ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 rounded-full text-xs transition-all ${
                      selectedInterests.includes(interest)
                        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent"
                        : "border-border/50 text-muted-foreground hover:border-primary/50"
                    }`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            <Button className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold rounded-xl neon-glow-blue">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default ProfileEdit;
