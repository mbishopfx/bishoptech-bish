"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ai/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ai/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ai/ui/select";
import { Badge } from "@/components/ai/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ai/ui/card";
import { DataTable } from "@/components/ai/ui/data-table";
import { Loader2, RefreshCw } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

interface Organization {
  _id: string;
  _creationTime: number;
  workos_id: string;
  name: string;
  plan?: "plus" | "pro";
  standardQuotaLimit?: number;
  premiumQuotaLimit?: number;
  billingCycleStart?: number;
  billingCycleEnd?: number;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
}

export default function AdminDashboardClient() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isSetPlanDialogOpen, setIsSetPlanDialogOpen] = useState(false);
  const [isSettingPlan, setIsSettingPlan] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/organizations");
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch organizations");
      }
      
      const data = await response.json();
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleSetPlan = async () => {
    if (!selectedOrg || !selectedPlan) return;

    try {
      setIsSettingPlan(true);
      const response = await fetch("/api/admin/organizations/set-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: selectedOrg._id,
          plan: selectedPlan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to set plan");
      }

      // Refresh organizations list
      await fetchOrganizations();
      setIsSetPlanDialogOpen(false);
      setSelectedOrg(null);
      setSelectedPlan("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set plan");
    } finally {
      setIsSettingPlan(false);
    }
  };


  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Not set";
    return new Date(timestamp).toLocaleDateString();
  };

  const getPlanBadgeVariant = (plan?: string) => {
    switch (plan) {
      case "plus":
        return "default";
      case "pro":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case "active":
        return "default";
      case "trialing":
        return "secondary";
      case "canceled":
      case "past_due":
        return "destructive";
      default:
        return "outline";
    }
  };

  const columns: ColumnDef<Organization>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "workos_id",
      header: "WorkOS ID",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground font-mono">
          {row.getValue("workos_id")}
        </div>
      ),
    },
    {
      accessorKey: "plan",
      header: "Plan",
      cell: ({ row }) => {
        const plan = row.getValue("plan") as string;
        return (
          <Badge variant={getPlanBadgeVariant(plan)}>
            {plan || "No Plan"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "quotas",
      header: "Quotas",
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className="text-sm">
            <div>Standard: {org.standardQuotaLimit || 0}</div>
            <div>Premium: {org.premiumQuotaLimit || 0}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "billingCycle",
      header: "Billing Cycle",
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className="text-sm">
            <div>Start: {formatDate(org.billingCycleStart)}</div>
            <div>End: {formatDate(org.billingCycleEnd)}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "subscriptionStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("subscriptionStatus") as string;
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {status || "none"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className="flex gap-2">
            <Dialog open={isSetPlanDialogOpen && selectedOrg?._id === org._id} onOpenChange={(open) => {
              setIsSetPlanDialogOpen(open);
              if (open) {
                setSelectedOrg(org);
                setSelectedPlan(org.plan || "");
              } else {
                setSelectedOrg(null);
                setSelectedPlan("");
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Set Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Plan for {org.name}</DialogTitle>
                  <DialogDescription>
                    Assign a subscription plan to this organization.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plus">Plus (1000 standard, 100 premium)</SelectItem>
                      <SelectItem value="pro">Pro (1500 standard, 300 premium)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsSetPlanDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSetPlan}
                    disabled={!selectedPlan || isSettingPlan}
                  >
                    {isSettingPlan && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Set Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading organizations...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchOrganizations} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Organizations</CardTitle>
          <Button onClick={fetchOrganizations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={organizations}
          searchKey="name"
          searchPlaceholder="Search organizations..."
          showPagination={true}
          showSearch={true}
        />
      </CardContent>
    </Card>
  );
}
