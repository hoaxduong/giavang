"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FieldMappings {
  dataPath: string;
  fields: {
    typeCode: string;
    buyPrice: string;
    sellPrice: string;
    timestamp: string;
    currency?: string;
    branch?: string; // SJC-specific field
    [key: string]: string | undefined; // Allow additional source-specific fields
  };
  transforms?: {
    timestamp?: "iso8601" | "unix" | "custom"; // Added 'custom' for SJC
    priceMultiplier?: number;
  };
}

interface CrawlerSource {
  id: string;
  name: string;
  api_url: string;
  api_type: string;
  is_enabled: boolean;
  priority: number;
  rate_limit_per_minute?: number;
  timeout_seconds?: number;
  field_mappings?: FieldMappings;
}

interface TypeMapping {
  id: string;
  source_id: string;
  external_code: string;
  retailer_code: string;
  // product_type_code removed
  // province_code removed
  label: string;
  is_enabled: boolean;
  retailer_product_id: string; // Mandatory
  retailer_products?: {
    product_name: string;
    retailer_code: string;
  };
}

export function CrawlerSources() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CrawlerSource | null>(null);
  const [activeTab, setActiveTab] = useState("config");
  const [formData, setFormData] = useState({
    name: "",
    apiUrl: "",
    apiType: "sjc",
    priority: 1,
    rateLimitPerMinute: 60,
    timeoutSeconds: 30,
    fieldMappings: {
      dataPath: "prices",
      fields: {
        typeCode: "type",
        buyPrice: "buy",
        sellPrice: "sell",
        timestamp: "timestamp",
        currency: "currency",
      },
      transforms: {
        timestamp: "unix" as "iso8601" | "unix" | "custom",
        priceMultiplier: 1,
      },
    },
  });
  const [error, setError] = useState<string | null>(null);

  // Type mapping state
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<TypeMapping | null>(
    null
  );
  const [mappingFormData, setMappingFormData] = useState({
    externalCode: "",
    retailerCode: "",
    retailerProductId: "",
    // productTypeCode removed
    // provinceCode removed
    label: "",
  });

  const { data: sources, isLoading } = useQuery({
    queryKey: ["crawler-sources"],
    queryFn: async () => {
      const res = await fetch("/api/admin/crawler/sources");
      if (!res.ok) throw new Error("Failed to fetch sources");
      const json = await res.json();
      return json.sources as CrawlerSource[];
    },
  });

  // Fetch mappings for the editing source
  const { data: mappings } = useQuery({
    queryKey: ["crawler-mappings", editingItem?.id],
    queryFn: async () => {
      if (!editingItem?.id) return [];
      const res = await fetch(
        `/api/admin/crawler/mappings?source_id=${editingItem.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch mappings");
      const json = await res.json();
      return json.mappings as TypeMapping[];
    },
    enabled: !!editingItem?.id && isDialogOpen,
  });

  // Fetch reference data for mapping form
  const { data: retailers } = useQuery({
    queryKey: ["retailers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/retailers");
      if (!res.ok) throw new Error("Failed to fetch retailers");
      const json = await res.json();
      return json.retailers;
    },
    enabled: isDialogOpen && activeTab === "mappings",
  });

  const { data: provinces } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const res = await fetch("/api/admin/provinces");
      if (!res.ok) throw new Error("Failed to fetch provinces");
      const json = await res.json();
      return json.provinces;
    },
    enabled: isDialogOpen && activeTab === "mappings",
  });

  // Fetch retailer products when retailer is selected
  const { data: retailerProducts } = useQuery({
    queryKey: ["retailer-products-list", mappingFormData.retailerCode],
    queryFn: async () => {
      if (!mappingFormData.retailerCode) return [];
      const res = await fetch(
        `/api/admin/retailers/${mappingFormData.retailerCode}/products`
      );
      if (!res.ok) throw new Error("Failed to fetch retailer products");
      const json = await res.json();
      return json.products;
    },
    enabled:
      isDialogOpen &&
      activeTab === "mappings" &&
      !!mappingFormData.retailerCode,
  });

  const { data: productTypes } = useQuery({
    queryKey: ["product-types"],
    queryFn: async () => {
      const res = await fetch("/api/admin/product-types");
      if (!res.ok) throw new Error("Failed to fetch product types");
      const json = await res.json();
      return json.productTypes;
    },
    enabled: isDialogOpen && activeTab === "mappings",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/crawler/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create source");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawler-sources"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/crawler/sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update source");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawler-sources"] });
      // Don't close dialog on update - user might want to continue editing mappings
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/crawler/sources/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete source");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawler-sources"] });
    },
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({
      id,
      isEnabled,
    }: {
      id: string;
      isEnabled: boolean;
    }) => {
      const res = await fetch(`/api/admin/crawler/sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawler-sources"] });
    },
  });

  // Mapping mutations
  const createMappingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/crawler/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, sourceId: editingItem!.id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create mapping");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crawler-mappings", editingItem?.id],
      });
      setIsMappingDialogOpen(false);
      resetMappingForm();
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/admin/crawler/mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update mapping");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crawler-mappings", editingItem?.id],
      });
      setIsMappingDialogOpen(false);
      resetMappingForm();
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/crawler/mappings?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete mapping");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crawler-mappings", editingItem?.id],
      });
    },
  });

  const toggleMappingEnabledMutation = useMutation({
    mutationFn: async ({
      id,
      isEnabled,
    }: {
      id: string;
      isEnabled: boolean;
    }) => {
      const res = await fetch(`/api/admin/crawler/mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isEnabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle mapping status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crawler-mappings", editingItem?.id],
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      apiUrl: "",
      apiType: "sjc",
      priority: 1,
      rateLimitPerMinute: 60,
      timeoutSeconds: 30,
      fieldMappings: {
        dataPath: "prices",
        fields: {
          typeCode: "type",
          buyPrice: "buy",
          sellPrice: "sell",
          timestamp: "timestamp",
          currency: "currency",
        },
        transforms: {
          timestamp: "unix" as "iso8601" | "unix",
          priceMultiplier: 1,
        },
      },
    });
    setEditingItem(null);
    setError(null);
    setActiveTab("config");
  };

  const resetMappingForm = () => {
    setMappingFormData({
      externalCode: "",
      retailerCode: "",
      retailerProductId: "",
      // productTypeCode removed
      // provinceCode removed
      label: "",
    });
    setEditingMapping(null);
  };

  const handleOpenDialog = (item?: CrawlerSource) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        apiUrl: item.api_url,
        apiType: item.api_type,
        priority: item.priority,
        rateLimitPerMinute: item.rate_limit_per_minute || 60,
        timeoutSeconds: item.timeout_seconds || 30,
        fieldMappings: item.field_mappings?.fields
          ? {
              dataPath: item.field_mappings.dataPath,
              fields: {
                typeCode: item.field_mappings.fields.typeCode,
                buyPrice: item.field_mappings.fields.buyPrice,
                sellPrice: item.field_mappings.fields.sellPrice,
                timestamp: item.field_mappings.fields.timestamp,
                currency: item.field_mappings.fields.currency || "currency",
              },
              transforms: {
                timestamp: item.field_mappings.transforms?.timestamp || "unix",
                priceMultiplier:
                  item.field_mappings.transforms?.priceMultiplier ?? 1,
              },
            }
          : {
              dataPath: "prices",
              fields: {
                typeCode: "type",
                buyPrice: "buy",
                sellPrice: "sell",
                timestamp: "timestamp",
                currency: "currency",
              },
              transforms: {
                timestamp: "unix" as "iso8601" | "unix",
                priceMultiplier: 1,
              },
            },
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      apiUrl: formData.apiUrl,
      apiType: formData.apiType,
      priority: formData.priority,
      rateLimitPerMinute: formData.rateLimitPerMinute,
      timeoutSeconds: formData.timeoutSeconds,
      fieldMappings: formData.fieldMappings,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleOpenMappingDialog = (mapping?: TypeMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setMappingFormData({
        externalCode: mapping.external_code,
        retailerCode: mapping.retailer_code,
        retailerProductId: mapping.retailer_product_id,
        // productTypeCode removed
        // provinceCode removed
        label: mapping.label,
      });
    } else {
      resetMappingForm();
    }
    setIsMappingDialogOpen(true);
  };

  const handleMappingSubmit = () => {
    const data = {
      externalCode: mappingFormData.externalCode,
      retailerCode: mappingFormData.retailerCode,
      retailerProductId: mappingFormData.retailerProductId,
      // productTypeCode removed
      // provinceCode removed
      label: mappingFormData.label,
    };

    if (editingMapping) {
      updateMappingMutation.mutate({ ...data, id: editingMapping.id });
    } else {
      createMappingMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Nguồn dữ liệu Crawler</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các API nguồn và ánh xạ type code
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm nguồn
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>API URL</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : !sources || sources.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Chưa có nguồn dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>
                    <a
                      href={source.api_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      {source.api_url.substring(0, 40)}...
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{source.api_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={source.is_enabled}
                        loading={
                          toggleEnabledMutation.isPending &&
                          toggleEnabledMutation.variables?.id === source.id
                        }
                        onCheckedChange={(checked) =>
                          toggleEnabledMutation.mutate({
                            id: source.id,
                            isEnabled: checked,
                          })
                        }
                      />
                      <Badge
                        variant={source.is_enabled ? "default" : "secondary"}
                      >
                        {source.is_enabled ? "Kích hoạt" : "Tắt"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{source.priority}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(source)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Bạn có chắc muốn xóa nguồn này?")) {
                            deleteMutation.mutate(source.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Main Source Dialog with Tabs */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Chỉnh sửa" : "Thêm"} nguồn dữ liệu
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="config">Cấu hình nguồn</TabsTrigger>
              <TabsTrigger value="mappings" disabled={!editingItem}>
                Ánh xạ Type Code {editingItem && `(${mappings?.length || 0})`}
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Source Configuration */}
            <TabsContent value="config" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Tên nguồn *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="VD: SJC, DOJI"
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiType">Loại API *</Label>
                    <Input
                      id="apiType"
                      value={formData.apiType}
                      onChange={(e) =>
                        setFormData({ ...formData, apiType: e.target.value })
                      }
                      placeholder="VD: sjc"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="apiUrl">API URL *</Label>
                  <Input
                    id="apiUrl"
                    value={formData.apiUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, apiUrl: e.target.value })
                    }
                    placeholder="https://api.example.com/prices"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Số nhỏ = ưu tiên cao
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="rateLimit">Rate Limit (req/min)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      value={formData.rateLimitPerMinute}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rateLimitPerMinute: parseInt(e.target.value) || 60,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeout">Timeout (giây)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={formData.timeoutSeconds}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeoutSeconds: parseInt(e.target.value) || 30,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold mb-3">
                    Cấu hình Field Mappings
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (Tùy chọn - chỉ cho nguồn dùng generic mapping)
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Lưu ý: SJC và một số nguồn khác dùng logic parse riêng,
                    không cần chỉnh field mappings
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="dataPath">Data Path *</Label>
                      <Input
                        id="dataPath"
                        value={formData.fieldMappings.dataPath}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fieldMappings: {
                              ...formData.fieldMappings,
                              dataPath: e.target.value,
                            },
                          })
                        }
                        placeholder="VD: prices hoặc data.prices"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Đường dẫn đến mảng prices trong API response
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="fieldBuyPrice">
                          Field: Buy Price *
                        </Label>
                        <Input
                          id="fieldBuyPrice"
                          value={formData.fieldMappings.fields.buyPrice}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fieldMappings: {
                                ...formData.fieldMappings,
                                fields: {
                                  ...formData.fieldMappings.fields,
                                  buyPrice: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="VD: buy"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fieldSellPrice">
                          Field: Sell Price *
                        </Label>
                        <Input
                          id="fieldSellPrice"
                          value={formData.fieldMappings.fields.sellPrice}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fieldMappings: {
                                ...formData.fieldMappings,
                                fields: {
                                  ...formData.fieldMappings.fields,
                                  sellPrice: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="VD: sell"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="fieldTimestamp">Field: Timestamp</Label>
                        <Input
                          id="fieldTimestamp"
                          value={formData.fieldMappings.fields.timestamp}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fieldMappings: {
                                ...formData.fieldMappings,
                                fields: {
                                  ...formData.fieldMappings.fields,
                                  timestamp: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="VD: timestamp"
                        />
                      </div>
                      <div>
                        <Label htmlFor="timestampFormat">
                          Format Timestamp
                        </Label>
                        <select
                          id="timestampFormat"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          value={
                            formData.fieldMappings.transforms?.timestamp ||
                            "unix"
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fieldMappings: {
                                ...formData.fieldMappings,
                                transforms: {
                                  ...formData.fieldMappings.transforms,
                                  timestamp: e.target.value as
                                    | "iso8601"
                                    | "unix"
                                    | "custom",
                                },
                              },
                            })
                          }
                        >
                          <option value="unix">Unix (seconds)</option>
                          <option value="iso8601">ISO 8601</option>
                          <option value="custom">
                            Custom (source-specific)
                          </option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="priceMultiplier">
                          Price Multiplier
                        </Label>
                        <Input
                          id="priceMultiplier"
                          type="number"
                          step="0.01"
                          value={
                            formData.fieldMappings.transforms
                              ?.priceMultiplier || 1
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fieldMappings: {
                                ...formData.fieldMappings,
                                transforms: {
                                  ...formData.fieldMappings.transforms,
                                  priceMultiplier:
                                    parseFloat(e.target.value) || 1,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {editingItem ? "Đóng" : "Hủy"}
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={createMutation.isPending || updateMutation.isPending}
                  disabled={!formData.name || !formData.apiUrl}
                >
                  {editingItem ? "Cập nhật" : "Thêm mới"}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Tab 2: Type Mappings */}
            <TabsContent value="mappings" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Ánh xạ giữa mã từ API nguồn và các thực thể nội bộ
                </p>
                <Button size="sm" onClick={() => handleOpenMappingDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm ánh xạ
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>External Code</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Retailer Product</TableHead>
                      {/* Product Type and Province removed */}
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!mappings || mappings.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Chưa có ánh xạ
                        </TableCell>
                      </TableRow>
                    ) : (
                      mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-mono">
                            {mapping.external_code}
                          </TableCell>
                          <TableCell>{mapping.label}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {mapping.retailer_code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {mapping.retailer_products?.product_name}
                            </Badge>
                          </TableCell>
                          {/* Removed Product Type and Province cells */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={mapping.is_enabled}
                                onCheckedChange={(checked) =>
                                  toggleMappingEnabledMutation.mutate({
                                    id: mapping.id,
                                    isEnabled: checked,
                                  })
                                }
                                loading={
                                  toggleMappingEnabledMutation.isPending &&
                                  toggleMappingEnabledMutation.variables?.id ===
                                    mapping.id
                                }
                              />
                              <Badge
                                variant={
                                  mapping.is_enabled ? "default" : "secondary"
                                }
                              >
                                {mapping.is_enabled ? "On" : "Off"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenMappingDialog(mapping)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (
                                    confirm("Bạn có chắc muốn xóa ánh xạ này?")
                                  ) {
                                    deleteMappingMutation.mutate(mapping.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Mapping Add/Edit Dialog */}
      <Dialog
        open={isMappingDialogOpen}
        onOpenChange={(open) => {
          setIsMappingDialogOpen(open);
          if (!open) resetMappingForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? "Chỉnh sửa" : "Thêm"} ánh xạ
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="externalCode">External Code *</Label>
                <Input
                  id="externalCode"
                  value={mappingFormData.externalCode}
                  onChange={(e) =>
                    setMappingFormData({
                      ...mappingFormData,
                      externalCode: e.target.value,
                    })
                  }
                  placeholder="VD: SJL1L10, DOHNL"
                />
              </div>
              <div>
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  value={mappingFormData.label}
                  onChange={(e) =>
                    setMappingFormData({
                      ...mappingFormData,
                      label: e.target.value,
                    })
                  }
                  placeholder="VD: Vàng SJC 1 lượng"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="retailer">Retailer *</Label>
                <Select
                  value={mappingFormData.retailerCode}
                  onValueChange={(value) =>
                    setMappingFormData({
                      ...mappingFormData,
                      retailerCode: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailers?.map((retailer: any) => (
                      <SelectItem key={retailer.id} value={retailer.code}>
                        {retailer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="retailer">Retailer *</Label>
                <Select
                  value={mappingFormData.retailerCode}
                  onValueChange={(value) =>
                    setMappingFormData({
                      ...mappingFormData,
                      retailerCode: value,
                      retailerProductId: "", // Reset product when retailer changes
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailers?.map((retailer: any) => (
                      <SelectItem key={retailer.id} value={retailer.code}>
                        {retailer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="retailerProduct">Retailer Product *</Label>
                <Select
                  value={mappingFormData.retailerProductId}
                  onValueChange={(value) =>
                    setMappingFormData({
                      ...mappingFormData,
                      retailerProductId: value,
                    })
                  }
                  disabled={!mappingFormData.retailerCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailerProducts?.map((rp: any) => (
                      <SelectItem key={rp.id} value={rp.id}>
                        {rp.productName} ({rp.productCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMappingDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleMappingSubmit}
              loading={
                createMappingMutation.isPending ||
                updateMappingMutation.isPending
              }
              disabled={
                !mappingFormData.externalCode ||
                !mappingFormData.retailerCode ||
                !mappingFormData.retailerProductId ||
                !mappingFormData.label
              }
            >
              {editingMapping ? "Cập nhật" : "Thêm mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
