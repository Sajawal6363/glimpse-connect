import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";

const UpgradePromptDialog = () => {
  const { prompt, clearPrompt } = useSubscriptionStore();

  return (
    <Dialog open={prompt.open} onOpenChange={(open) => !open && clearPrompt()}>
      <DialogContent className="glass border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-5 h-5 text-primary" />
            {prompt.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {prompt.description}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-primary" />
            Recommended: {prompt.suggestedPlan.toUpperCase()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Upgrade now to unlock this feature instantly.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={clearPrompt}>
            Maybe later
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground"
          >
            <Link to="/plans" onClick={clearPrompt}>
              View plans
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePromptDialog;
