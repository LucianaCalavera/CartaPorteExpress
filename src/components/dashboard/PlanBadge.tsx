import { Badge } from "@/components/ui/badge";

const PLAN_LABELS: Record<string, string> = {
  trial: "Prueba",
  active: "Activo",
  past_due: "Pago pendiente",
  cancelled: "Cancelado",
};

const PLAN_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  trial: "secondary",
  active: "default",
  past_due: "destructive",
  cancelled: "destructive",
};

export function PlanBadge({ status }: { status: string | null }) {
  const key = status ?? "trial";
  return <Badge variant={PLAN_VARIANTS[key] ?? "secondary"}>{PLAN_LABELS[key] ?? key}</Badge>;
}
