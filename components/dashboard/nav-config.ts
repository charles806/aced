import {
  BookOpen,
  CalendarClock,
  FileText,
  Home,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match the href exactly (e.g. /dashboard) instead of by prefix. */
  exact?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, exact: true },
  { label: "Subjects", href: "/dashboard/subjects", icon: BookOpen },
  { label: "Notes", href: "/dashboard/notes", icon: FileText },
  { label: "AI Tutor", href: "/dashboard/ai-tutor", icon: Sparkles },
  { label: "Upcoming", href: "/dashboard/upcoming", icon: CalendarClock },
];

export const SIDEBAR_BOTTOM_NAV: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const MOBILE_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, exact: true },
  { label: "Subjects", href: "/dashboard/subjects", icon: BookOpen },
  { label: "Notes", href: "/dashboard/notes", icon: FileText },
  { label: "AI Tutor", href: "/dashboard/ai-tutor", icon: Sparkles },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function getNavItemLabel(pathname: string): string {
  const all = [...NAV_ITEMS, ...SIDEBAR_BOTTOM_NAV];
  const match = all.find(
    (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)),
  );
  return match?.label ?? "Dashboard";
}
