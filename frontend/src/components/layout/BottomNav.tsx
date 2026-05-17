'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  MapIcon, 
  ListBulletIcon, 
  UserCircleIcon,
  HeartIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';
import {
  MapIcon as MapIconSolid,
  ListBulletIcon as ListBulletIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  HeartIcon as HeartIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid
} from '@heroicons/react/24/solid';

interface BottomNavProps {
  locale: string;
}

export function BottomNav({ locale }: BottomNavProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === `/${locale}`) {
      return pathname === `/${locale}`;
    }
    return pathname?.startsWith(path);
  };

  const navItems = [
    {
      href: `/${locale}`,
      label: t('home'),
      icon: MapIcon,
      activeIcon: MapIconSolid,
    },
    {
      href: `/${locale}/places`,
      label: t('places'),
      icon: ListBulletIcon,
      activeIcon: ListBulletIconSolid,
    },
    {
      href: `/${locale}/favorites`,
      label: t('saved'),
      icon: HeartIcon,
      activeIcon: HeartIconSolid,
    },
    {
      href: `/${locale}/profile`,
      label: t('profile'),
      icon: UserCircleIcon,
      activeIcon: UserCircleIconSolid,
    },
    {
      href: `/${locale}/settings`,
      label: t('settings'),
      icon: Cog6ToothIcon,
      activeIcon: Cog6ToothIconSolid,
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200/50 safe-area-inset-bottom z-50"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = active ? item.activeIcon : item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center
                  py-2 px-3 min-w-[64px] min-h-[56px]
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset rounded-lg
                  ${active 
                    ? 'text-emerald-600 scale-105' 
                    : 'text-gray-500 hover:text-emerald-600'
                  }
                `}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`w-6 h-6 transition-transform ${active ? 'scale-110' : ''}`} aria-hidden="true" />
                <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
