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
      className="
        fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom
        bg-white/95 backdrop-blur-lg shadow-[0_-1px_3px_rgba(0,0,0,0.05)]
        lg:bottom-8 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto
        lg:rounded-2xl lg:shadow-xl lg:ring-1 lg:ring-black/5
        lg:px-2 lg:w-auto
      "
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around lg:justify-center lg:gap-1 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.activeIcon : item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center justify-center
                py-2 px-3 min-w-[64px] min-h-[56px]
                lg:flex-row lg:gap-2 lg:min-w-0 lg:min-h-0
                lg:px-4 lg:py-2.5 lg:rounded-xl
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset rounded-lg
                ${active 
                  ? 'text-emerald-600 lg:bg-emerald-50' 
                  : 'text-gray-500 hover:text-emerald-600 lg:hover:bg-gray-50'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={`w-6 h-6 lg:w-5 lg:h-5 transition-transform ${active ? 'scale-105' : ''}`} aria-hidden="true" />
              <span className={`text-xs mt-1 lg:mt-0 lg:text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-600 lg:hidden" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
