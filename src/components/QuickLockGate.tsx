import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  biometricsAvailable,
  checkPin,
  getLock,
  registerBiometrics,
  setPin,
  verifyBiometrics,
} from "@/lib/quick-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const UNLOCK_KEY = "dc_unlocked_until";
const UNLOCK_MINUTES = 30;

/** Requires PIN or biometrics on this device before showing plant screens. */
export function QuickLockGate({ children }: { children: ReactNode }) {
  const { me, isLoading } = useCurrentUser();
  const [state, setState] = useState<"checking" | "setup" | "locked" | "open">("checking");
  const [pin, setPinValue] = useState("");
  const [bio, setBio] = useState(false);

  useEffect(() => {
    if (!me) return;
    biometricsAvailable().then(setBio);
    const until = Number(sessionStorage.getItem(UNLOCK_KEY) ?? 0);
    if (until > Date.now()) return setState("open");
    setState(getLock(me.id) ? "locked" : "setup");
  }, [me]);

  function open() {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now() + UNLOCK_MINUTES * 60_000));
    setState("open");
  }

  if (isLoading || !me || state === "checking") {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Cargando…</div>;
  }
  if (state === "open") return <>{children}</>;

  const hasBio = !!getLock(me.id)?.credentialId;

  async function submit() {
    if (!/^\d{4,6}$/.test(pin)) return toast.error("El PIN debe tener de 4 a 6 números");
    if (state === "setup") {
      await setPin(me!.id, pin);
      if (bio) {
        try {
          await registerBiometrics(me!.id, me!.email || me!.name);
          toast.success("Huella / Face ID activada");
        } catch {
          toast.message("Puedes activar la huella más tarde");
        }
      }
      return open();
    }
    if (await checkPin(me!.id, pin)) open();
    else {
      setPinValue("");
      toast.error("PIN incorrecto");
    }
  }

  async function useBio() {
    try {
      if (await verifyBiometrics(me!.id)) open();
    } catch {
      toast.error("No se reconoció la huella, usa tu PIN");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="text-4xl">🔒</div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {state === "setup" ? "Crea tu PIN de respaldo" : `Hola, ${me.name}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state === "setup" ? "4 a 6 números. Solo se guarda en este teléfono." : "Desbloquea para continuar el turno."}
          </p>
        </div>
        {state === "locked" && hasBio && (
          <Button size="lg" className="h-14 w-full" onClick={useBio}>Usar huella / Face ID</Button>
        )}
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-14 text-center text-2xl tracking-[0.5em]"
          placeholder="••••"
          aria-label="PIN"
        />
        <Button size="lg" variant={hasBio ? "secondary" : "default"} className="h-12 w-full" onClick={submit}>
          {state === "setup" ? "Guardar PIN" : "Entrar con PIN"}
        </Button>
      </div>
    </main>
  );
}
