import Link from "next/link";
import { Truck, FileCheck2, Send, ShieldCheck } from "lucide-react";
import { LeadCaptureForm } from "@/components/marketing/LeadCaptureForm";
import { Button } from "@/components/ui/button";

const BENEFICIOS = [
  {
    icon: FileCheck2,
    title: "Valida antes de timbrar",
    description:
      "Detecta CP inválido, vigencia expirada o clave de producto mal antes de gastar en el PAC.",
  },
  {
    icon: ShieldCheck,
    title: "Corrige sin salir de la app",
    description: "Edita la fila con error, revalida al instante y timbra en cuanto quede lista.",
  },
  {
    icon: Send,
    title: "Entrega por WhatsApp",
    description:
      "El chofer o el cliente reciben el XML/PDF en segundos, sin depender de tu correo.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <Truck className="size-5" />
          CartaPorteExpress
        </div>
        <Button variant="outline" render={<Link href="/login">Iniciar sesión</Link>} />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="max-w-2xl text-3xl font-bold text-balance sm:text-4xl">
          Deja de perder horas corrigiendo timbres rechazados por el SAT
        </h1>
        <p className="text-muted-foreground max-w-xl text-balance">
          Sube tu Excel, valida Carta Porte 3.1 antes de timbrar, corrige los errores en minutos y
          entrega el XML/PDF por WhatsApp al chofer o al cliente. Sin depender de tu contador.
        </p>
        <LeadCaptureForm />
      </section>

      <section className="grid grid-cols-1 gap-6 px-6 py-16 sm:grid-cols-3 sm:px-16">
        {BENEFICIOS.map((beneficio) => (
          <div key={beneficio.title} className="flex flex-col gap-2">
            <beneficio.icon className="text-primary size-6" />
            <h2 className="font-semibold">{beneficio.title}</h2>
            <p className="text-muted-foreground text-sm">{beneficio.description}</p>
          </div>
        ))}
      </section>

      <footer className="text-muted-foreground border-t px-6 py-6 text-center text-sm">
        CartaPorteExpress — hecho para flotillas chicas en México.
      </footer>
    </main>
  );
}
