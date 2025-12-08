"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, Save, X, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateSlug } from "@/lib/blog/utils";

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
  targetCategoryId?: string;
  targetTagIds?: string[];
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
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Data for selects
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Settings State
  const [providerConfig, setProviderConfig] = useState<AiConfig>({
    provider: "google",
    apiKey: "",
  });
  const [postConfig, setPostConfig] = useState<{
    targetCategoryId?: string;
    targetTagIds?: string[];
  }>({
    targetCategoryId: "",
    targetTagIds: [],
  });

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingPostConfig, setSavingPostConfig] = useState(false);

  // Create Dialog States
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
      const [aiRes, postRes] = await Promise.all([
        fetch("/api/admin/settings?key=ai_config"),
        fetch("/api/admin/settings?key=gold_post_config"),
      ]);

      const aiData = await aiRes.json();
      if (aiData.setting?.value) {
        setProviderConfig({
          provider: aiData.setting.value.provider || "google",
          apiKey: aiData.setting.value.apiKey || "",
        });
      }

      const postData = await postRes.json();
      if (postData.setting?.value) {
        setPostConfig({
          targetCategoryId: postData.setting.value.targetCategoryId || "",
          targetTagIds: postData.setting.value.targetTagIds || [],
        });
      }
    } catch (_error) {
      // Ignore error
    } finally {
      setLoadingSettings(false);
    }
  };

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

  // Save Post Config
  const handleSavePostConfig = async () => {
    setSavingPostConfig(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "gold_post_config",
          value: postConfig,
          description: "Daily Gold Post Configuration",
        }),
      });

      if (!res.ok) throw new Error("Failed to save post config");
      toast.success("Content configuration saved");
    } catch (_error) {
      toast.error("Failed to save content configuration");
    } finally {
      setSavingPostConfig(false);
    }
  };

  // Create Handlers
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
      setPostConfig({ ...postConfig, targetCategoryId: data.category.id });
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
      setPostConfig({
        ...postConfig,
        targetTagIds: [...(postConfig.targetTagIds || []), data.tag.id],
      });
      setCreateTagOpen(false);
      setNewTagName("");
      toast.success("Created tag successfully");
    } catch (_error) {
      toast.error("Failed to create tag");
    } finally {
      setCreateTagLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSettings();
    fetchData();
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

      fetchLogs();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate post"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    const currentTags = postConfig.targetTagIds || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId];
    setPostConfig({ ...postConfig, targetTagIds: newTags });
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
        {/* Left Column: Settings */}
        <div className="space-y-6">
          {/* AI Provider Config */}
          <Card>
            <CardHeader>
              <CardTitle>AI Provider Settings</CardTitle>
              <CardDescription>
                Configure the LLM provider (Google Gemini or OpenAI).
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
                    <p className="text-xs text-muted-foreground">
                      {providerConfig.provider === "google"
                        ? "Get key from Google AI Studio"
                        : "Get key from OpenAI Platform"}
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveProvider}
                    disabled={savingProvider}
                  >
                    {savingProvider && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!savingProvider && <Save className="mr-2 h-4 w-4" />}
                    Save Provider
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Post Content Config */}
          <Card>
            <CardHeader>
              <CardTitle>Content Configuration</CardTitle>
              <CardDescription>
                Set target category and tags for the generated post.
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
                    <div className="flex items-center justify-between">
                      <Label>Target Category</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setCreateCategoryOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
                    </div>
                    <Select
                      value={postConfig.targetCategoryId || ""}
                      onValueChange={(val) =>
                        setPostConfig({ ...postConfig, targetCategoryId: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Target Tags</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setCreateTagOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={
                            postConfig.targetTagIds?.includes(tag.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag.id)}
                        >
                          {tag.name}
                          {postConfig.targetTagIds?.includes(tag.id) && (
                            <X className="ml-1 h-3 w-3" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleSavePostConfig}
                    disabled={savingPostConfig}
                  >
                    {savingPostConfig && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!savingPostConfig && <Save className="mr-2 h-4 w-4" />}
                    Save Configuration
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: History */}
        <div className="space-y-6">
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
                              log.status === "success"
                                ? "default"
                                : "destructive"
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

      {/* Create Category Dialog */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category for generated posts.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newCategory">Category Name</Label>
            <Input
              id="newCategory"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Gold News"
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
              {createCategoryLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={createTagOpen} onOpenChange={setCreateTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Add a new tag for generated posts.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newTag">Tag Name</Label>
            <Input
              id="newTag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="e.g., Market Updates"
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
              {createTagLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
