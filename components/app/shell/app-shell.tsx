"use client";

import {
  BarChart3,
  Camera,
  ChevronsUpDown,
  ExternalLink,
  Home,
  LayoutGrid,
  LogOut,
  Moon,
  Network,
  Package,
  Palette,
  Plus,
  Receipt,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LogoMark } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface ShellProps {
  user: { name: string; email: string; image: string | null };
  store: {
    name: string;
    slug: string;
    logoUrl: string | null;
    ondcEnabled: boolean;
  };
  plan: string;
  isFree: boolean;
  openOrders: number;
  children: React.ReactNode;
}

const NAV = [
  {
    label: "Shop",
    items: [
      { title: "Home", href: "/dashboard", icon: Home, exact: true },
      { title: "Add products", href: "/dashboard/add", icon: Plus },
      { title: "Catalog", href: "/dashboard/catalog", icon: Package },
      {
        title: "Orders",
        href: "/dashboard/orders",
        icon: Receipt,
        badge: "orders" as const,
      },
    ],
  },
  {
    label: "Sell",
    items: [
      { title: "Channels", href: "/dashboard/channels", icon: LayoutGrid },
      {
        title: "ONDC",
        href: "/dashboard/channels/ondc",
        icon: Network,
        badge: "ondc" as const,
      },
      { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Create",
    items: [
      { title: "Photo studio", href: "/dashboard/studio", icon: Sparkles },
      { title: "Brand kit", href: "/dashboard/brand", icon: Palette },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/dashboard/channels")
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/ondc`))
    );
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  store,
  plan,
  isFree,
  openOrders,
  children,
}: ShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        store={store}
        plan={plan}
        isFree={isFree}
        openOrders={openOrders}
      />
      <SidebarInset className="min-w-0">
        <TopBar store={store} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-12 lg:px-8">
          {children}
        </main>
        <MobileTabs openOrders={openOrders} />
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppSidebar({
  user,
  store,
  plan,
  isFree,
  openOrders,
}: Omit<ShellProps, "children">) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3 pt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:px-0.5"
          onClick={() => setOpenMobile(false)}
        >
          <LogoMark className="size-6 shrink-0" />
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Onboarder
          </span>
        </Link>
        <Link
          href="/dashboard/settings"
          onClick={() => setOpenMobile(false)}
          className="flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
        >
          <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              store.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{store.name}</div>
            <div className="text-xs text-muted-foreground">{plan} plan</div>
          </div>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(
                      pathname,
                      item.href,
                      "exact" in item ? item.exact : false,
                    )}
                    tooltip={item.title}
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {"badge" in item &&
                  item.badge === "orders" &&
                  openOrders > 0 ? (
                    <SidebarMenuBadge className="rounded-full bg-primary px-1.5 text-primary-foreground">
                      {openOrders}
                    </SidebarMenuBadge>
                  ) : null}
                  {"badge" in item && item.badge === "ondc" ? (
                    <SidebarMenuBadge>
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          store.ondcEnabled
                            ? "bg-success"
                            : "bg-muted-foreground/40",
                        )}
                      />
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="View storefront">
                <a href={`/s/${store.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  <span>View storefront</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/dashboard/settings")}
                tooltip="Settings"
              >
                <Link
                  href="/dashboard/settings"
                  onClick={() => setOpenMobile(false)}
                >
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-3">
        {isFree ? (
          <Link
            href="/dashboard/settings#plan"
            className="mb-1 rounded-lg bg-accent px-3 py-2.5 text-xs text-accent-foreground group-data-[collapsible=icon]:hidden"
          >
            <span className="font-medium">Upgrade to Pro</span> for 2,000
            products, 3 marketplaces and 500 AI credits a month.
          </Link>
        ) : null}
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserMenu({ user }: { user: ShellProps["user"] }) {
  const { resolvedTheme, setTheme } = useTheme();
  const initials = (user.name || user.email).slice(0, 1).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent"
        >
          <Avatar className="size-8 rounded-md">
            <AvatarImage src={user.image ?? undefined} alt="" />
            <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">
              {user.name || "Your account"}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}{" "}
          {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/" })}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar({ store }: { store: ShellProps["store"] }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-5">
      <SidebarTrigger className="-ml-1" />
      <div className="truncate text-sm font-medium md:hidden">{store.name}</div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Link href="/dashboard/add/packaged">
            <Camera /> Scan
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/dashboard/add">
            <Plus /> Add products
          </Link>
        </Button>
      </div>
    </header>
  );
}

function MobileTabs({ openOrders }: { openOrders: number }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const tabs = [
    { href: "/dashboard", label: "Home", icon: Home, exact: true },
    { href: "/dashboard/catalog", label: "Catalog", icon: Package },
    { href: "/dashboard/add", label: "Add", icon: Plus, primary: true },
    {
      href: "/dashboard/orders",
      label: "Orders",
      icon: Receipt,
      count: openOrders,
    },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = isActive(pathname, t.href, t.exact);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px]"
            >
              <span
                className={cn(
                  "relative grid place-items-center rounded-full",
                  t.primary
                    ? "-mt-5 size-12 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "size-6",
                  !t.primary &&
                    (active ? "text-primary" : "text-muted-foreground"),
                )}
              >
                <t.icon className={t.primary ? "size-6" : "size-5"} />
                {t.count ? (
                  <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
                    {t.count}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
        >
          <span className="grid size-6 place-items-center">
            <LayoutGrid className="size-5" />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}
