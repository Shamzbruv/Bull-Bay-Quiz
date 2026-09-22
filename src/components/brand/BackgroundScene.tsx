import clsx from 'clsx';
import type { ReactNode } from 'react';
import { brand } from '../../config/brand';

interface BackgroundSceneProps {
  variant: 'dark' | 'light' | 'hero';
  children: ReactNode;
  className?: string;
}

const IMAGE: Record<BackgroundSceneProps['variant'], string> = {
  dark: brand.backgrounds.game,
  light: brand.backgrounds.light,
  hero: brand.backgrounds.hero,
};

export function BackgroundScene({ variant, children, className }: BackgroundSceneProps) {
  return (
    <div className={clsx('relative min-h-screen overflow-hidden', variant === 'light' ? 'bg-white' : 'bg-bb-deep', className)}>
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${IMAGE[variant]}')` }}
        aria-hidden
      />
      {variant === 'light' ? (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[1px]" aria-hidden />
      ) : (
        <div className="fixed inset-0 bg-gradient-to-b from-bb-deep/60 via-bb-navy/35 to-bb-deep/80" aria-hidden />
      )}
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
