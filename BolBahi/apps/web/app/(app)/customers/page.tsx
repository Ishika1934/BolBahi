'use client';

import { CustomersPanel } from '@/components/panels/CustomersPanel';
import { useRouter } from 'next/navigation';

export default function CustomersPage() {
  const router = useRouter();
  return <CustomersPanel onClose={() => router.push('/home')} />;
}

