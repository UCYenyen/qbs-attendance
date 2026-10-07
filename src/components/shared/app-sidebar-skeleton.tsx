import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

// Fixed widths: SidebarMenuSkeleton uses Math.random(), which can't run during prerender.
const WIDTHS = ["w-3/4", "w-2/3", "w-4/5", "w-1/2", "w-3/5"]

function Row({ width }: { width: string }) {
  return (
    <div className="flex h-8 items-center gap-2 px-2">
      <Skeleton className="size-4 rounded-md" />
      <Skeleton className={`h-4 ${width}`} />
    </div>
  )
}

export function AppSidebarSkeleton() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Row width="w-2/3" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2">
          {WIDTHS.map((width) => (
            <SidebarMenuItem key={width}>
              <Row width={width} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
