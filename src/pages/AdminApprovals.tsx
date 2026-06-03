import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Inbox, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  useAllChangeRequests,
  useChangeRequestsRealtime,
} from "@/hooks/useProfileChangeRequests";
import { ApprovalRow } from "@/components/admin/ApprovalRow";

interface DriverLite {
  id: string;
  name: string;
  code: string | null;
  date_of_birth: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_expiration: string | null;
  med_card_expiration: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_name_2: string | null;
  emergency_contact_phone_2: string | null;
  emergency_contact_relationship_2: string | null;
}

export default function AdminApprovals() {
  const navigate = useNavigate();
  useChangeRequestsRealtime();

  const pendingQ = useAllChangeRequests(["pending"]);
  const historyQ = useAllChangeRequests(["approved", "rejected", "auto_applied"]);

  const driverIds = useMemo(() => {
    const ids = new Set<string>();
    pendingQ.data?.forEach((r) => ids.add(r.driver_id));
    historyQ.data?.forEach((r) => ids.add(r.driver_id));
    return Array.from(ids);
  }, [pendingQ.data, historyQ.data]);

  const [driverMap, setDriverMap] = useState<Map<string, DriverLite>>(new Map());

  useEffect(() => {
    if (driverIds.length === 0) {
      setDriverMap(new Map());
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("drivers")
        .select(
          "id, name, code, date_of_birth, address, phone, email, license_number, license_expiration, med_card_expiration, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, emergency_contact_name_2, emergency_contact_phone_2, emergency_contact_relationship_2",
        )
        .in("id", driverIds);
      const m = new Map<string, DriverLite>();
      ((data ?? []) as DriverLite[]).forEach((d) => m.set(d.id, d));
      setDriverMap(m);
    })();
  }, [driverIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = pendingQ.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/drivers")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profile & Document Approvals</h1>
          <div className="text-sm text-muted-foreground">
            Review driver-submitted credential updates and contact-info activity.
          </div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Inbox className="h-4 w-4" /> Needs Review
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-amber-500 text-amber-950 hover:bg-amber-500">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> Recent Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingQ.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (pendingQ.data?.length ?? 0) === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                Nothing waiting for review.
              </div>
            ) : (
              [...(pendingQ.data ?? [])]
                .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
                .map((r) => {
                  const d = driverMap.get(r.driver_id);
                  return (
                    <ApprovalRow
                      key={r.id}
                      request={r}
                      driverName={d?.name}
                      driverCode={d?.code ?? null}
                      currentDriver={d ?? null}
                    />
                  );
                })
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {historyQ.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (historyQ.data?.length ?? 0) === 0 ? (
              <div className="text-center text-muted-foreground py-16">No activity yet.</div>
            ) : (
              (historyQ.data ?? []).map((r) => {
                const d = driverMap.get(r.driver_id);
                return (
                  <ApprovalRow
                    key={r.id}
                    request={r}
                    driverName={d?.name}
                    driverCode={d?.code ?? null}
                    currentDriver={d ?? null}
                    readOnly
                  />
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
