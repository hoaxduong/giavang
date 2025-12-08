"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AutomationLog {
  id: string;
  type: string;
  status: "success" | "error";
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
}

interface AiConfig {
  provider: "google" | "openai";
  apiKey: string;
}

export default function BlogAutomationPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Settings State
  const [aiConfig, setAiConfig] = useState<AiConfig>({
    provider: "google",
    apiKey: "",
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/automation/gold-post?limit=20");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs);
    } catch (_error) {
      toast.error("Could not load automation history");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings?key=ai_config");
      const data = await res.json();
      if (data.setting?.value) {
        setAiConfig(data.setting.value);
      }
    } catch (_error) {
      // Ignore error, use default
    } finally {
      setLoadingSettings(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "ai_config",
          value: aiConfig,
          description: "AI Provider Configuration",
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSettings();
  }, []);

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/automation/gold-post", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to regenerate");

      toast.success("Post regenerated successfully!", {
        description: `Style: ${data.generatedStyle}`,
      });

      // Refresh logs
      fetchLogs();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate post"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog Automation</h1>
          <p className="text-muted-foreground mt-2">
            Manage automated content generation for &quot;Giá vàng hôm
            nay&quot;.
          </p>
        </div>
        <Button onClick={handleRegenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Regenerate Post Now
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>
              Configure the AI provider for content generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSettings ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={aiConfig.provider}
                    onValueChange={(val: "google" | "openai") =>
                      setAiConfig({ ...aiConfig, provider: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Gemini</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, apiKey: e.target.value })
                    }
                    placeholder="Enter API Key"
                  />
                  <p className="text-xs text-muted-foreground">
                    {aiConfig.provider === "google"
                      ? "Get key from Google AI Studio"
                      : "Get key from OpenAI Platform"}
                  </p>
                </div>

                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {!savingSettings && <Save className="mr-2 h-4 w-4" />}
                  Save Settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation History</CardTitle>
            <CardDescription>
              Recent automated actions and their status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  {/* <TableHead>Message</TableHead> */}
                  <TableHead>Style/Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      No logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(
                          new Date(log.created_at),
                          "dd/MM/yyyy HH:mm:ss"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "success" ? "default" : "destructive"
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {!!log.meta?.style && (
                          <span className="block">
                            {String(log.meta.style)}
                          </span>
                        )}
                        {!!log.meta?.error && (
                          <span
                            className="block text-red-500"
                            title={String(JSON.stringify(log.meta.error))}
                          >
                            Error
                          </span>
                        )}
                        <span className="block text-[10px] opacity-70 mt-1 capitalize">
                          {log.type.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
