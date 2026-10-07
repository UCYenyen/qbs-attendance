import { LogOutIcon } from "lucide-react"

import { signOutAction } from "@/actions/auth"
import { SidebarMenuButton } from "@/components/ui/sidebar"

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SidebarMenuButton type="submit" tooltip="Keluar">
        <LogOutIcon />
        <span>Keluar</span>
      </SidebarMenuButton>
    </form>
  )
}
