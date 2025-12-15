"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Save, Plus, Trash, Play, Clock, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateSlug } from "@/lib/blog/utils";
import { DEFAULT_PROMPT_TEMPLATE } from "@/lib/ai/gold-post-shared";

interface AutomationLog {
  id: string;
  type: string;
  status: "success" | "error";
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
}

interface Automation {
  id: string;
  name: string;
  type: string;
  schedule: string;
  is_active: boolean;
  prompt_template?: string;
  config: {
    targetCategoryId?: string;
    targetTagIds?: string[];
    postMode?: "update" | "create";
  };
  last_run_at?: string;
  next_run_at?: string;
}

interface AiConfig {
  provider: "google" | "openai";
  apiKey: string;
}

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

export default function BlogAutomationPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  // Data for selects
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Settings State
  const [providerConfig, setProviderConfig] = useState<AiConfig>({
    provider: "google",
    apiKey: "",
  });

  const [savingProvider, setSavingProvider] = useState(false);

  // Edit/Create State
  const [editingAutomation, setEditingAutomation] =
    useState<Partial<Automation> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);

  // Create Dialog States for resources
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [createCategoryLoading, setCreateCategoryLoading] = useState(false);

  const [createTagOpen, setCreateTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [createTagLoading, setCreateTagLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch("/api/admin/blog/categories"),
        fetch("/api/admin/blog/tags"),
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      if (tagsRes.ok) {
        const data = await tagsRes.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories/tags", error);
    }
  };

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/admin/automations");
      const data = await res.json();
      if (data.automations) {
        setAutomations(data.automations);
      }
    } catch (error) {
      toast.error("Failed to load automations");
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/automation/gold-post?limit=20");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs);
    } catch (_error) {
      // toast.error("Could not load automation history");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const aiRes = await fetch("/api/admin/settings?key=ai_config");
      const aiData = await aiRes.json();
      if (aiData.setting?.value) {
        setProviderConfig({
          provider: aiData.setting.value.provider || "google",
          apiKey: aiData.setting.value.apiKey || "",
        });
      }
    } catch (_error) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchData();
    fetchAutomations();
    fetchLogs();
    fetchSettings();
  }, []);

  // Save Provider Settings
  const handleSaveProvider = async () => {
    setSavingProvider(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "ai_config",
          value: providerConfig,
          description: "AI Provider Configuration",
        }),
      });

      if (!res.ok) throw new Error("Failed to save provider settings");
      toast.success("AI Provider settings saved");
    } catch (_error) {
      toast.error("Failed to save provider settings");
    } finally {
      setSavingProvider(false);
    }
  };

  // Automation CRUD
  const handleEditAutomation = (automation?: Automation) => {
    if (automation) {
      setEditingAutomation({ ...automation });
    } else {
      setEditingAutomation({
        name: "New Automation",
        type: "gold_price_post",
        schedule: "0 8 * * *",
        is_active: true,
        prompt_template: DEFAULT_PROMPT_TEMPLATE,
        config: {
          targetCategoryId: "",
          targetTagIds: [],
          postMode: "update",
        },
      });
    }
    setEditDialogOpen(true);
  };

  const handleSaveAutomation = async () => {
    if (!editingAutomation) return;
    setSavingAutomation(true);
    try {
      const isNew = !editingAutomation.id;
      const url = isNew
        ? "/api/admin/automations"
        : `/api/admin/automations/${editingAutomation.id}`;

      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAutomation),
      });

      if (!res.ok) throw new Error("Failed to save automation");

      toast.success(isNew ? "Automation created" : "Automation updated");
      setEditDialogOpen(false);
      fetchAutomations();
    } catch (error) {
      toast.error("Failed to save automation");
      console.error(error);
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    try {
      await fetch(`/api/admin/automations/${id}`, { method: "DELETE" });
      toast.success("Automation deleted");
      fetchAutomations();
    } catch (error) {
      toast.error("Failed to delete automation");
    }
  };

  const handleRunAutomation = async (automation: Automation) => {
    toast.promise(
      async () => {
        // Pass ID to route to use specific config
        const res = await fetch(
          `/api/admin/automation/gold-post?automationId=${automation.id}`,
          { method: "POST" }
        );
        if (!res.ok) throw new Error("Failed");
        fetchLogs();
      },
      {
        loading: "Running automation...",
        success: "Automation ran successfully",
        error: "Failed to run automation",
      }
    );
  };

  // Helper for Category/Tags creation
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreateCategoryLoading(true);
    try {
      const slug = generateSlug(newCategoryName);
      const res = await fetch("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: newCategoryName, isEnabled: true }),
      });

      if (!res.ok) throw new Error("Failed to create category");
      const data = await res.json();

      setCategories([...categories, data.category]);
      if (editingAutomation?.config) {
        setEditingAutomation({
          ...editingAutomation,
          config: {
            ...editingAutomation.config,
            targetCategoryId: data.category.id,
          },
        });
      }
      setCreateCategoryOpen(false);
      setNewCategoryName("");
      toast.success("Created category successfully");
    } catch (_error) {
      toast.error("Failed to create category");
    } finally {
      setCreateCategoryLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreateTagLoading(true);
    try {
      const slug = generateSlug(newTagName);
      const res = await fetch("/api/admin/blog/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: newTagName, isEnabled: true }),
      });

      if (!res.ok) throw new Error("Failed to create tag");
      const data = await res.json();

      setTags([...tags, data.tag]);
      if (editingAutomation?.config) {
        setEditingAutomation({
          ...editingAutomation,
          config: {
            ...editingAutomation.config,
            targetTagIds: [
              ...(editingAutomation.config.targetTagIds || []),
              data.tag.id,
            ],
          },
        });
      }
      setCreateTagOpen(false);
      setNewTagName("");
      toast.success("Created tag successfully");
    } catch (_error) {
      toast.error("Failed to create tag");
    } finally {
      setCreateTagLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog Automation</h1>
          <p className="text-muted-foreground mt-2">
            Manage automated content generation schedules and templates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleEditAutomation()}>
            <Plus className="mr-2 h-4 w-4" />
            New Automation
          </Button>
        </div>
      </div>

      <Tabs defaultValue="automations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Global Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-4">
          {automations.map((auto) => (
            <Card key={auto.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg font-bold">
                    {auto.name}
                  </CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <Badge variant="outline" className="mr-2">
                      {auto.type}
                    </Badge>
                    <Clock className="w-3 h-3 mr-1" /> {auto.schedule}
                    {auto.is_active ? (
                      <Badge className="ml-2 bg-green-500 hover:bg-green-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-2">
                        Paused
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRunAutomation(auto)}
                    title="Run Now"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditAutomation(auto)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteAutomation(auto.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Last run:{" "}
                  {auto.last_run_at
                    ? format(new Date(auto.last_run_at), "dd/MM/yyyy HH:mm")
                    : "Never"}
                </div>
              </CardContent>
            </Card>
          ))}
          {automations.length === 0 && (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground">
                No automations configured.
              </p>
              <Button variant="link" onClick={() => handleEditAutomation()}>
                Create one
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(
                          new Date(log.created_at),
                          "dd/MM/yyyy HH:mm:ss"
                        )}
                      </TableCell>
                      <TableCell>{log.type}</TableCell>
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
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>AI Provider Configuration</CardTitle>
              <CardDescription>
                Global settings for AI generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={providerConfig.provider}
                  onValueChange={(val: "google" | "openai") =>
                    setProviderConfig({ ...providerConfig, provider: val })
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
                  value={providerConfig.apiKey}
                  onChange={(e) =>
                    setProviderConfig({
                      ...providerConfig,
                      apiKey: e.target.value,
                    })
                  }
                  placeholder="Enter API Key"
                />
              </div>

              <Button onClick={handleSaveProvider} disabled={savingProvider}>
                {savingProvider ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAutomation?.id ? "Edit Automation" : "New Automation"}
            </DialogTitle>
            <DialogDescription>
              Configure automation schedule and prompt.
            </DialogDescription>
          </DialogHeader>

          {editingAutomation && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingAutomation.name}
                    onChange={(e) =>
                      setEditingAutomation({
                        ...editingAutomation,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingAutomation.type}
                    onValueChange={(val) =>
                      setEditingAutomation({ ...editingAutomation, type: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold_price_post">
                        Gold Price Post
                      </SelectItem>
                      {/* Future types here */}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Schedule (Cron Expression)</Label>
                <div className="flex gap-2">
                  <Input
                    value={editingAutomation.schedule}
                    onChange={(e) =>
                      setEditingAutomation({
                        ...editingAutomation,
                        schedule: e.target.value,
                      })
                    }
                    placeholder="0 8 * * *"
                  />
                  <Button variant="outline" asChild>
                    <a
                      href="https://crontab.guru/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Help
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: <code>0 8 * * *</code> = Every day at 8:00 AM UTC.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Prompt Template</Label>
                <Textarea
                  className="font-mono text-xs min-h-[200px]"
                  value={editingAutomation.prompt_template || ""}
                  onChange={(e) =>
                    setEditingAutomation({
                      ...editingAutomation,
                      prompt_template: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Available variables:{" "}
                  <code>
                    {"{{date_str}}"}, {"{{price_summary}}"},{" "}
                    {"{{world_price_info}}"}, {"{{style}}"}
                  </code>
                </p>
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3">Post Configuration</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Post Mode</Label>
                    <Select
                      value={editingAutomation.config?.postMode || "update"}
                      onValueChange={(val: "update" | "create") =>
                        setEditingAutomation({
                          ...editingAutomation,
                          config: {
                            ...editingAutomation.config,
                            postMode: val,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">
                          Update Existing Post
                        </SelectItem>
                        <SelectItem value="create">Create New Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Category</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreateCategoryOpen(true)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Select
                      value={editingAutomation.config?.targetCategoryId || ""}
                      onValueChange={(val) =>
                        setEditingAutomation({
                          ...editingAutomation,
                          config: {
                            ...editingAutomation.config,
                            targetCategoryId: val,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tags</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreateTagOpen(true)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={
                            editingAutomation.config?.targetTagIds?.includes(
                              tag.id
                            )
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            const current =
                              editingAutomation.config?.targetTagIds || [];
                            const fresh = current.includes(tag.id)
                              ? current.filter((id) => id !== tag.id)
                              : [...current, tag.id];
                            setEditingAutomation({
                              ...editingAutomation,
                              config: {
                                ...editingAutomation.config,
                                targetTagIds: fresh,
                              },
                            });
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Switch
                  id="active-mode"
                  checked={editingAutomation.is_active}
                  onCheckedChange={(checked) =>
                    setEditingAutomation({
                      ...editingAutomation,
                      is_active: checked,
                    })
                  }
                />
                <Label htmlFor="active-mode">Enable Automation</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAutomation} disabled={savingAutomation}>
              {savingAutomation && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reusing Create Category/Tag Dialogs logic from previous version manually adapted */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newCategory">Category Name</Label>
            <Input
              id="newCategory"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCategory();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateCategoryOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || createCategoryLoading}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createTagOpen} onOpenChange={setCreateTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newTag">Tag Name</Label>
            <Input
              id="newTag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTag();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTagOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || createTagLoading}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
