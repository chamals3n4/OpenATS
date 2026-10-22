import type {ReactNode} from 'react';
import {HugeiconsIcon, type IconSvgElement} from '@hugeicons/react';
import {
  ArrowRight01Icon,
  BriefcaseBusinessIcon,
  CoPresentIcon,
  Home01Icon,
  Layout03Icon,
  Notification03Icon,
  Quiz03Icon,
  Settings02Icon,
  TelegramIcon,
  UsersRoundIcon,
} from '@hugeicons/core-free-icons';

// The dashboard's sidebar (components/layout/app-sidebar.tsx)
const NAV: {title: string; icon: IconSvgElement; chevron?: boolean}[] = [
  {title: 'Overview', icon: Home01Icon},
  {title: 'Manage Jobs', icon: BriefcaseBusinessIcon},
  {title: 'Candidates', icon: UsersRoundIcon},
  {title: 'Interviews', icon: CoPresentIcon},
  {title: 'Assessments', icon: Quiz03Icon},
  {title: 'Manage Offers', icon: TelegramIcon},
  {title: 'Templates', icon: Layout03Icon},
  {title: 'Settings', icon: Settings02Icon, chevron: true},
];

/** The dashboard frame: header and sidebar as in app/(dashboard)/layout.tsx. */
export default function Shell({active, children}: {active: string; children: ReactNode}): ReactNode {
  return (
    <div className="flex h-full flex-col bg-white dark:bg-[oklch(0.145_0_0)]">
      <header className="flex h-14 w-full shrink-0 items-center justify-between gap-4 border-b border-[#cfcfcf] bg-[#fdfdfd] px-6 dark:border-white/10 dark:bg-[oklch(0.205_0_0)]">
        <span className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight text-black dark:text-white">
          <img src="/img/brand/openats-logo.png" alt="" className="size-8 object-contain dark:brightness-0 dark:invert" />
          OpenATS
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="flex size-9 items-center justify-center rounded-full text-[#5c5c5c] dark:text-neutral-300">
            <HugeiconsIcon icon={Notification03Icon} className="size-5" />
          </span>
          <span className="rounded-full p-0.5">
            <span className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-slate-200 text-xs font-semibold text-slate-700 dark:border-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
              MP
            </span>
          </span>
        </span>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-56 shrink-0 border-r border-[#cfcfcf] bg-[#fdfdfd] pt-4 dark:border-white/10 dark:bg-[oklch(0.205_0_0)]">
          <ul className="flex flex-col gap-0.5 px-3 py-2">
            {NAV.map((item) => {
              const isActive = item.title === active;
              return (
                <li key={item.title}>
                  <span
                    className={`flex h-9 w-full items-center gap-3.5 rounded-sm px-2 text-[15px] ${
                      isActive
                        ? 'bg-[#0e434b] font-semibold text-white dark:bg-[oklch(0.269_0_0)]'
                        : 'font-medium text-[#5c5c5c] dark:text-[oklch(0.985_0_0)]'
                    }`}
                  >
                    <HugeiconsIcon icon={item.icon} className="size-[18px] shrink-0" />
                    <span className="flex-1">{item.title}</span>
                    {item.chevron && <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0 opacity-50" />}
                  </span>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="relative min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
