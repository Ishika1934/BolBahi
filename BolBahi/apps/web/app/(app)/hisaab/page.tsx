'use client';

import { HisaabPanel } from '@/components/panels/HisaabPanel';
import { useRouter } from 'next/navigation';

export default function HisaabPage() {
  const router = useRouter();
  return <HisaabPanel onClose={() => router.push('/home')} />;
}

