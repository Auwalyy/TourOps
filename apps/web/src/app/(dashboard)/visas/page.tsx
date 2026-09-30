'use client';
import { Suspense } from 'react';
import { ClipboardCheck, Layers, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/Card';
import { Tabs, TabDef, useTabParam } from '@/components/ui/Tabs';
import { ApplicationsTab } from '@/components/features/visas/ApplicationsTab';
import { IssuedGroupsTab } from '@/components/features/issued-visas/IssuedGroupsTab';
import { IssuedIndividualTab } from '@/components/features/issued-visas/IssuedIndividualTab';

/**
 * Everything visa in one place: the applications still in the pipeline, and the
 * visas already issued — kept as partner groups or as one-off uploads.
 */
const TABS: TabDef[] = [
  { id: 'applications', label: 'Applications', icon: ClipboardCheck },
  { id: 'groups', label: 'Issued — Groups', icon: Layers },
  { id: 'issued', label: 'Issued — Individual', icon: FileText },
];

function VisasPageInner() {
  const { active, setActive } = useTabParam(TABS);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Visas"
        description="Applications in progress, and the visas you have already issued"
      />
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      {active === 'applications' && <ApplicationsTab />}
      {active === 'groups' && <IssuedGroupsTab />}
      {active === 'issued' && <IssuedIndividualTab />}
    </div>
  );
}

export default function VisasPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <VisasPageInner />
    </Suspense>
  );
}
