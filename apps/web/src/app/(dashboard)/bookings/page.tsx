'use client';
import { Suspense } from 'react';
import { FileText, UsersRound } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/Card';
import { Tabs, TabDef, useTabParam } from '@/components/ui/Tabs';
import { BookingsListTab } from '@/components/features/bookings/BookingsListTab';
import { FamilyGroupsTab } from '@/components/features/bookings/FamilyGroupsTab';
import { UpgradeNotice } from '@/components/shared/UpgradeNotice';
import { useEntitlements } from '@/hooks/useEntitlements';

/** Individual arrangements, and the family/departure groups they roll up into. */
const TABS: TabDef[] = [
  { id: 'bookings', label: 'Bookings', icon: FileText },
  { id: 'groups', label: 'Family & Groups', icon: UsersRound },
];

function BookingsPageInner() {
  const { active, setActive } = useTabParam(TABS);
  const { entitlements } = useEntitlements();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bookings"
        description="Travel arrangements, and the families and batches they belong to"
      />
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      {active === 'bookings' && <BookingsListTab />}
      {active === 'groups' &&
        (entitlements.groups ? (
          <FamilyGroupsTab />
        ) : (
          <UpgradeNotice
            feature="Family & group bookings"
            body="Put a whole family or departure batch under one payer, with a shared ledger, while each traveller keeps their own documents and visa status."
          />
        ))}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <BookingsPageInner />
    </Suspense>
  );
}
