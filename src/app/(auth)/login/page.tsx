import { MagicLinkForm } from "@/components/auth/MagicLinkForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">CartaPorteExpress</h1>
          <p className="text-muted-foreground text-sm">
            Ingresa tu correo y te mandamos un link de acceso.
          </p>
        </div>
        <MagicLinkForm />
      </div>
    </main>
  );
}
