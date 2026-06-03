import { PortalShell } from "@/components/tablet/PortalShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortalProfileTab } from "@/components/portal/PortalProfileTab";
import { PortalDocumentsTab } from "@/components/portal/PortalDocumentsTab";
import { User, Folder } from "lucide-react";

export default function PortalFolder() {
  return (
    <PortalShell title="My Folder" subtitle="Your information and documents">
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger value="info" className="text-base gap-2 h-12">
            <User className="h-5 w-5" /> My Info
          </TabsTrigger>
          <TabsTrigger value="docs" className="text-base gap-2 h-12">
            <Folder className="h-5 w-5" /> My Documents
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <PortalProfileTab />
        </TabsContent>
        <TabsContent value="docs">
          <PortalDocumentsTab />
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}
