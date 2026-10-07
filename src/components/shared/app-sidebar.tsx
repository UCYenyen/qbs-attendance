"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { initials, ROLE_LABELS } from "@/lib/format"
import { ADMIN_NAV, EMPLOYEE_NAV } from "@/lib/navigation"
import type { CurrentUser } from "@/types/user"

interface AppSidebarProps {
  user: CurrentUser
  pendingRequests: number
  footer: ReactNode
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/me") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({ user, pendingRequests, footer }: AppSidebarProps) {
  const pathname = usePathname()
  const items = user.role === "admin" ? ADMIN_NAV : EMPLOYEE_NAV

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={user.role === "admin" ? "/admin" : "/me"} />}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
                Q
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-semibold">QBS Presence</span>
                <span className="text-xs text-muted-foreground">Absensi</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{user.role === "admin" ? "Admin" : "Karyawan"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.href === "/admin/schedule-requests" && pendingRequests > 0 ? (
                    <SidebarMenuBadge>{pendingRequests}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <Avatar className="size-8">
                <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium">{user.fullName}</span>
                <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>{footer}</SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
