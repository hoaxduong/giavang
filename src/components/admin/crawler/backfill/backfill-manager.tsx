'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BackfillForms } from './backfill-forms'
import { JobsList } from './jobs-list'

export function BackfillManager() {
  const [activeTab, setActiveTab] = useState('create')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="create">Tạo công việc</TabsTrigger>
        <TabsTrigger value="jobs">Danh sách công việc</TabsTrigger>
      </TabsList>

      <TabsContent value="create" className="space-y-4">
        <BackfillForms onJobCreated={() => setActiveTab('jobs')} />
      </TabsContent>

      <TabsContent value="jobs" className="space-y-4">
        <JobsList />
      </TabsContent>
    </Tabs>
  )
}
