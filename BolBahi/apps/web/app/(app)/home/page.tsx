'use client';

import { OrbitalCarousel } from '@/components/OrbitalCarousel';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full min-h-[calc(100vh-65px)]">
      <OrbitalCarousel />
    </div>
  );
}
