'use client';

import { SettingsPanel } from '@/components/panels/SettingsPanel';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  return <SettingsPanel onClose={() => router.push('/home')} />;
}

