import { NotificationSettingsManager } from "@/features/admin/settings/notification-settings";
import { AISettingsManager } from "@/features/admin/settings/ai-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Sparkles } from "lucide-react";

export const metadata = { title: "Cài đặt" };

export default function AdminSettingsPage() {
  return (
    <Tabs defaultValue="notifications" className="gap-6">
      <TabsList variant="line" className="w-full justify-start gap-1">
        <TabsTrigger value="notifications" className="gap-2 px-4">
          <Bell className="size-4" /> Thông báo email
        </TabsTrigger>
        <TabsTrigger value="ai" className="gap-2 px-4">
          <Sparkles className="size-4" /> AI
        </TabsTrigger>
      </TabsList>
      <TabsContent value="notifications">
        <NotificationSettingsManager />
      </TabsContent>
      <TabsContent value="ai">
        <AISettingsManager />
      </TabsContent>
    </Tabs>
  );
}