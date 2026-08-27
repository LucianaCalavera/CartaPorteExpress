import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProcesoDetail } from "@/components/dashboard/ProcesoDetail";

export default async function ProcesoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: proceso } = await supabase
    .from("procesos")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();

  if (!proceso) notFound();

  return <ProcesoDetail procesoId={proceso.id} />;
}
