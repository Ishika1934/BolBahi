'use client';

import { StockPanel } from '@/components/panels/StockPanel';
import { useRouter } from 'next/navigation';

export default function StockPage() {
  const router = useRouter();
  return <StockPanel onClose={() => router.push('/home')} />;
}

