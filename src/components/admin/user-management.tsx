"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { UserProfile } from "@/lib/auth/types";

export function UserManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<
    Record<string, "user" | "admin">
  >({});

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const { users } = await response.json();
      return users as (UserProfile & { email: string | null })[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "user" | "admin";
    }) => {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const handleRoleChange = async (
    userId: string,
    newRole: "user" | "admin",
  ) => {
    setSelectedRole((prev) => ({ ...prev, [userId]: newRole }));
    await updateRole.mutateAsync({ userId, role: newRole });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đang tải...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quản Lý Người Dùng</CardTitle>
        <CardDescription>
          Quản lý vai trò và thông tin người dùng
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users && users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.full_name
                          ? user.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : user.email?.[0].toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">
                          {user.full_name || "Người dùng"}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {user.email || "Không có email"}
                          </p>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {user.role === "admin"
                              ? "Quản trị viên"
                              : "Người dùng"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant={user.role === "user" ? "default" : "outline"}
                        onClick={() => handleRoleChange(user.id, "user")}
                        disabled={
                          updateRole.isPending || user.id === currentUser?.id
                        }
                        title={
                          user.id === currentUser?.id
                            ? "Bạn không thể thay đổi vai trò của chính mình"
                            : ""
                        }
                      >
                        Người dùng
                      </Button>
                      <Button
                        size="sm"
                        variant={user.role === "admin" ? "default" : "outline"}
                        onClick={() => handleRoleChange(user.id, "admin")}
                        disabled={
                          updateRole.isPending || user.id === currentUser?.id
                        }
                        title={
                          user.id === currentUser?.id
                            ? "Bạn không thể thay đổi vai trò của chính mình"
                            : ""
                        }
                      >
                        Quản trị
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              Không có người dùng nào
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
