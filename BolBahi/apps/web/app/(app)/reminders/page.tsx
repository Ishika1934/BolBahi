'use client';

import { RemindersPanel } from '@/components/panels/RemindersPanel';
import { useRouter } from 'next/navigation';

export default function RemindersPage() {
  const router = useRouter();
  return <RemindersPanel onClose={() => router.push('/home')} />;
}

