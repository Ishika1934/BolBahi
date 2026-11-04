'use client';

import { AuthForm } from '@/components/AuthForm';

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start sm:justify-center px-4 py-12 overflow-y-auto">
      <AuthForm mode="register" />
    </main>
  );
}

