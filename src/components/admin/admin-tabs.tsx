'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagement } from './user-management'
import { RetailersTab } from './config/retailers-tab'
import { ProvincesTab } from './config/provinces-tab'
import { ProductTypesTab } from './config/product-types-tab'

export function AdminTabs() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="users">Người dùng</TabsTrigger>
        <TabsTrigger value="retailers">Thương hiệu</TabsTrigger>
        <TabsTrigger value="provinces">Tỉnh thành</TabsTrigger>
        <TabsTrigger value="products">Loại vàng</TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="mt-6">
        <UserManagement />
      </TabsContent>

      <TabsContent value="retailers" className="mt-6">
        <RetailersTab />
      </TabsContent>

      <TabsContent value="provinces" className="mt-6">
        <ProvincesTab />
      </TabsContent>

      <TabsContent value="products" className="mt-6">
        <ProductTypesTab />
      </TabsContent>
    </Tabs>
  )
}
