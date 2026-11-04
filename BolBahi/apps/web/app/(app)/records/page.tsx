'use client';

import { RecordsPanel } from '@/components/panels/RecordsPanel';
import { useRouter } from 'next/navigation';

export default function RecordsPage() {
  const router = useRouter();
  return <RecordsPanel onClose={() => router.push('/home')} />;
}

