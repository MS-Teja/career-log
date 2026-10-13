import { useSearchParams } from 'react-router-dom';
import { useAdminQueue, useAdminReports, useAdminStats, useSeniorRequests } from '@/api/hooks';
import { PageHeader } from '@/components/PageHeader';
import { StatTile } from '@/components/StatTile';
import { TabPanel, Tabs } from '@/components/ui/Tabs';
import { CompaniesTab } from './CompaniesTab';
import { ReviewList } from './ReviewList';
import { SeniorRequestsTab } from './SeniorRequestsTab';
import { UsersTab } from './UsersTab';

const TABS = ['queue', 'seniors', 'reports', 'rejected', 'companies', 'users'] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'queue';
  const setTab = (t: Tab) => setParams(t === 'queue' ? {} : { tab: t }, { replace: true });

  const stats = useAdminStats();
  const queue = useAdminQueue('pending');
  const rejected = useAdminQueue('rejected');
  const reports = useAdminReports();
  const seniors = useSeniorRequests();

  return (
    <div className="container-page pb-16">
      <PageHeader title="Moderation" description="Nothing goes live until it's approved here." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Awaiting review" value={stats.data?.pending ?? '—'} />
        <StatTile label="Published" value={stats.data?.approved ?? '—'} />
        <StatTile label="Changes requested" value={stats.data?.rejected ?? '—'} />
        <StatTile label="Reported posts" value={stats.data?.flagged ?? '—'} />
        <StatTile label="Verified users" value={stats.data?.users ?? '—'} className="col-span-2 md:col-span-1" />
      </div>

      <Tabs
        id="admin"
        className="mt-8"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'queue', label: 'Review queue', count: queue.data?.length },
          { value: 'seniors', label: 'Senior requests', count: seniors.data?.length },
          { value: 'reports', label: 'Reported', count: reports.data?.length },
          { value: 'rejected', label: 'Changes requested', count: rejected.data?.length },
          { value: 'companies', label: 'Companies' },
          { value: 'users', label: 'Users' },
        ]}
      />
      <TabPanel id="admin" value={tab} className="mt-6">
        {tab === 'queue' && <ReviewList query={queue} mode="pending" />}
        {tab === 'seniors' && <SeniorRequestsTab query={seniors} />}
        {tab === 'reports' && <ReviewList query={reports} mode="reported" />}
        {tab === 'rejected' && <ReviewList query={rejected} mode="rejected" />}
        {tab === 'companies' && <CompaniesTab />}
        {tab === 'users' && <UsersTab />}
      </TabPanel>
    </div>
  );
}
