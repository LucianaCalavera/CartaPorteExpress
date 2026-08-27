import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropzoneValidator } from "@/components/dashboard/DropzoneValidator";
import { ProcesosHistoryTable } from "@/components/dashboard/ProcesosHistoryTable";
import { createClient } from "@/lib/supabase/server";
import type { ProcesoSummary } from "@/types/api";
import type { ProcesoStatus } from "@/types/cpe";

const RECENT_LIMIT = 50;

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("procesos")
    .select(
      "id, original_filename, status, total_rows, valid_rows, error_rows, stamped_rows, failed_rows, created_at",
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  const procesos: ProcesoSummary[] = (rows ?? []).map((p) => ({
    id: p.id,
    originalFilename: p.original_filename,
    status: (p.status ?? "uploaded") as ProcesoStatus,
    totalRows: p.total_rows ?? 0,
    validRows: p.valid_rows ?? 0,
    errorRows: p.error_rows ?? 0,
    stampedRows: p.stamped_rows ?? 0,
    failedRows: p.failed_rows ?? 0,
    createdAt: p.created_at ?? new Date().toISOString(),
  }));

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const procesosEsteMes = procesos.filter((p) => new Date(p.createdAt) >= startOfMonth).length;
  const cfdiTimbrados = procesos.reduce((acc, p) => acc + p.stampedRows, 0);
  const erroresPendientes = procesos.reduce((acc, p) => acc + p.errorRows, 0);

  const stats = [
    { label: "Procesos este mes", value: procesosEsteMes },
    { label: "CFDI timbrados", value: cfdiTimbrados },
    { label: "Errores pendientes", value: erroresPendientes },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Sube tu Excel para validar y timbrar tus Cartas Porte.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">{stat.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <DropzoneValidator />

      <div>
        <h2 className="mb-3 text-lg font-medium">Historial</h2>
        <ProcesosHistoryTable procesos={procesos} />
      </div>
    </div>
  );
}
