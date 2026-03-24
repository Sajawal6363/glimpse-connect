import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Save, Loader2, ArrowLeft, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { isAdminUser, type SubscriptionTier } from "@/lib/subscription";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import AppLayout from "@/components/layout/AppLayout";

type SubscriptionRow = {
  user_id: string;
  plan: SubscriptionTier;
  status: string;
  billing_cycle: string;
  current_period_end: string;
  profiles?:
    | {
        username: string;
        email: string;
      }[]
    | null;
};

const editableBooleanEntitlements = [
  { key: "canUseGenderFilter", label: "Gender filter" },
  { key: "canSendMedia", label: "Media sharing" },
  { key: "canSeeProfileViewers", label: "Profile viewers" },
  { key: "canMessageNonFollowers", label: "Message non-followers" },
] as const;

const AdminSubscriptions = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { planConfigs, refreshRemoteState } = useSubscriptionStore();
  const [savingPlan, setSavingPlan] = useState<SubscriptionTier | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [editablePlans, setEditablePlans] = useState(() => ({
    ...planConfigs,
  }));

  const allowed = useMemo(() => isAdminUser(user), [user]);

  useEffect(() => {
    setEditablePlans({ ...planConfigs });
  }, [planConfigs]);

  const fetchSubscriptions = async () => {
    setLoadingSubs(true);
    const { data } = await supabase
      .from("user_subscriptions")
      .select(
        "user_id, plan, status, billing_cycle, current_period_end, profiles:user_id(username, email)",
      )
      .eq("is_current", true)
      .order("current_period_end", { ascending: true })
      .limit(50);

    setSubscriptions((data as SubscriptionRow[]) || []);
    setLoadingSubs(false);
  };

  useEffect(() => {
    if (!allowed || !user?.id) return;
    void refreshRemoteState(user.id);
    void fetchSubscriptions();
  }, [allowed, refreshRemoteState, user?.id]);

  const updatePlanField = (
    plan: SubscriptionTier,
    field: "monthlyPrice" | "yearlyPrice",
    value: number,
  ) => {
    setEditablePlans((prev) => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [field]: Number.isFinite(value) ? value : prev[plan][field],
      },
    }));
  };

  const updatePlanToggle = (
    plan: SubscriptionTier,
    key: (typeof editableBooleanEntitlements)[number]["key"],
    value: boolean,
  ) => {
    setEditablePlans((prev) => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        entitlements: {
          ...prev[plan].entitlements,
          [key]: value,
        },
      },
    }));
  };

  const savePlan = async (plan: SubscriptionTier) => {
    const payload = editablePlans[plan];
    setSavingPlan(plan);

    const { error } = await supabase.from("subscription_plans").upsert(
      {
        id: plan,
        name: payload.name,
        monthly_price: payload.monthlyPrice,
        yearly_price: payload.yearlyPrice,
        badge: payload.badge,
        highlighted: payload.highlighted,
        entitlements: payload.entitlements,
      },
      { onConflict: "id" },
    );

    if (error) {
      toast({
        title: "Could not save plan",
        description: error.message,
        variant: "destructive",
      });
      setSavingPlan(null);
      return;
    }

    if (user?.id) {
      await refreshRemoteState(user.id);
    }

    toast({ title: `${payload.name} updated` });
    setSavingPlan(null);
  };

  if (!allowed) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="glass rounded-2xl p-6 text-center">
            <Shield className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h1 className="text-2xl font-bold mb-2">Access denied</h1>
            <p className="text-muted-foreground mb-4">
              You need admin access to open subscription controls.
            </p>
            <Button asChild>
              <Link to="/settings">Back to settings</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link to="/settings">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Subscription Admin</h1>
              <p className="text-sm text-muted-foreground">
                Manage pricing, plan features, and active subscriptions.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(["free", "premium", "vip"] as SubscriptionTier[]).map((plan) => {
            const config = editablePlans[plan];
            return (
              <div key={plan} className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{config.name}</h2>
                  {config.badge && (
                    <span className="text-xs rounded-full px-2 py-1 bg-primary/10 text-primary">
                      {config.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs text-muted-foreground">
                    Monthly Price
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={config.monthlyPrice}
                      onChange={(e) =>
                        updatePlanField(
                          plan,
                          "monthlyPrice",
                          Number(e.target.value),
                        )
                      }
                      className="pl-9"
                    />
                  </div>

                  <label className="text-xs text-muted-foreground">
                    Yearly Price
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={config.yearlyPrice}
                      onChange={(e) =>
                        updatePlanField(
                          plan,
                          "yearlyPrice",
                          Number(e.target.value),
                        )
                      }
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {editableBooleanEntitlements.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                      <Switch
                        checked={Boolean(config.entitlements[item.key])}
                        onCheckedChange={(checked) =>
                          updatePlanToggle(plan, item.key, checked)
                        }
                      />
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => savePlan(plan)}
                  disabled={savingPlan === plan}
                  className="w-full"
                >
                  {savingPlan === plan ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save {config.name}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Current subscriptions</h2>
            <Button
              variant="outline"
              onClick={fetchSubscriptions}
              disabled={loadingSubs}
            >
              {loadingSubs ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Renews</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((row) => (
                  <TableRow key={`${row.user_id}-${row.current_period_end}`}>
                    <TableCell>
                      <div className="font-medium">
                        {row.profiles?.[0]?.username || row.user_id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.profiles?.[0]?.email || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{row.plan}</TableCell>
                    <TableCell className="capitalize">{row.status}</TableCell>
                    <TableCell className="capitalize">
                      {row.billing_cycle}
                    </TableCell>
                    <TableCell>
                      {new Date(row.current_period_end).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminSubscriptions;
