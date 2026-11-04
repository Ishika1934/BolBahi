'use client';

import { CommandsPanel } from '@/components/panels/CommandsPanel';
import { useRouter } from 'next/navigation';

export default function CommandsPage() {
  const router = useRouter();
  return <CommandsPanel onClose={() => router.push('/home')} />;
}

