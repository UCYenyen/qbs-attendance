import { Badge } from "@/components/ui/badge"
import { REQUEST_STATUS_LABELS, STATUS_LABELS } from "@/lib/format"
import type { AttendanceStatus } from "@/types/attendance"
import type { RequestStatus } from "@/types/schedule"

const ATTENDANCE_VARIANT: Record<AttendanceStatus, "default" | "secondary" | "outline" | "destructive"> = {
  attend: "default",
  sick: "secondary",
  excused: "outline",
  absence: "destructive",
}

const REQUEST_VARIANT: Record<RequestStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
}

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <Badge variant={ATTENDANCE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={REQUEST_VARIANT[status]}>{REQUEST_STATUS_LABELS[status]}</Badge>
}
