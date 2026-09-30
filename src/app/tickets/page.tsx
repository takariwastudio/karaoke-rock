"use client";
import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";

const PAYMENT_INFO = {
  pago_movil: {
    label: "Pago Móvil",
    fields: [
      { label: "Teléfono", value: "04127089438" },
      { label: "Banco", value: "Banco de Venezuela" },
      { label: "Cédula", value: "V-20452809" },
      { label: "Nombre", value: "Oscar Machado" },
    ],
  },
  transferencia: {
    label: "Transferencia Bancaria",
    fields: [
      { label: "Banco", value: "Banco de Venezuela" },
      { label: "Cuenta", value: "01020378330000785024" },
      { label: "Titular", value: "Oscar Machado" },
      { label: "RIF/CI", value: "V-20452809" },
    ],
  },
  binance: {
    label: "Binance Pay",
    fields: [{ label: "Binance ID", value: "194102141" }],
  },
};

type Method = keyof typeof PAYMENT_INFO;

export default function TicketsPage() {
  const [event, setEvent] = useState<any>(null);
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [method, setMethod] = useState<Method>("pago_movil");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cedula: "",
    payment_ref: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/event")
      .then((r) => r.json())
      .then(({ event }) => {
        if (event) setEvent(event);
      });
  }, []);

  const price =
    method === "binance"
      ? `${event?.ticket_price_usdt ?? 5} USDT`
      : event?.ticket_price_bs
        ? `Bs. ${Number(event.ticket_price_bs).toLocaleString("es-VE")}`
        : "— Bs.";

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Requerido";
    if (!form.cedula.trim()) errs.cedula = "Requerido";
    if (!form.email.includes("@")) errs.email = "Email inválido";
    if (!form.phone.trim()) errs.phone = "Requerido";
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async () => {
    if (!form.payment_ref.trim()) {
      setErrors({ payment_ref: "Ingresa el número de referencia" });
      return;
    }
    if (!event) return;
    setSubmitting(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        payment_method: method,
        event_id: event.id,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErrors({ payment_ref: data.error || "Error al enviar" });
      return;
    }
    setStep("success");
  };

  if (step === "success")
    return (
      <div className="min-h-screen bg-r-bg flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <CheckCircle size={64} className="text-r-green mx-auto" />
          <h2 className="font-display text-3xl tracking-wide">
            ¡Solicitud enviada!
          </h2>
          <div className="card text-left space-y-2">
            <p className="text-sm text-r-muted">
              Revisaremos tu pago y te enviaremos tu entrada con el código QR a:
            </p>
            <p className="font-semibold">{form.email}</p>
            <p className="text-xs text-r-muted mt-2">
              Esto puede tomar algunos minutos. Revisa también tu carpeta de
              spam.
            </p>
          </div>
          <a href="/" className="btn-ghost inline-block w-full text-center">
            Volver al inicio
          </a>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-r-bg flex flex-col w-full max-w-md mx-auto">
      <header className="bg-r-surf border-b border-r-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Image
          src="/HOR_B.webp"
          alt="Karaoke Rock"
          width={0}
          height={0}
          sizes="100vw"
          className="h-8 w-auto"
          priority
        />
        <span className="text-xs text-r-muted uppercase tracking-widest">
          Entradas
        </span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {event && (
          <div className="card relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-r-red to-r-amber" />
            <h2 className="font-display text-2xl tracking-wide">
              {event.name}
            </h2>
            {(event.starts_at || event.date) && (
              <p className="text-r-muted text-sm mt-1 capitalize">
                {new Date(event.starts_at || event.date).toLocaleDateString(
                  "es-VE",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
                {event.starts_at && (
                  <span className="text-r-muted">
                    {" "}
                    ·{" "}
                    {new Date(event.starts_at).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-r-amber font-display text-xl">{price}</span>
              <span className="text-r-muted text-xs">
                · incluye 🍺 2 cervezas
              </span>
            </div>
          </div>
        )}

        {step === "form" && (
          <>
            <div className="card space-y-4">
              <h3 className="font-semibold">Tus datos</h3>
              {[
                {
                  k: "name",
                  label: "Nombre completo",
                  type: "text",
                  ph: "Como aparece en tu cédula",
                },
                {
                  k: "cedula",
                  label: "Cédula",
                  type: "text",
                  ph: "V-12345678",
                },
                {
                  k: "email",
                  label: "Correo electrónico",
                  type: "email",
                  ph: "tu@correo.com",
                },
                {
                  k: "phone",
                  label: "Teléfono",
                  type: "tel",
                  ph: "04XX-XXXXXXX",
                },
              ].map(({ k, label, type, ph }) => (
                <div key={k}>
                  <label className="label">{label}</label>
                  <input
                    type={type}
                    className={clsx("input", errors[k] && "border-r-red")}
                    placeholder={ph}
                    value={form[k as keyof typeof form]}
                    onChange={set(k)}
                  />
                  {errors[k] && (
                    <p className="text-r-red text-xs mt-1">{errors[k]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="card space-y-3">
              <h3 className="font-semibold">Método de pago</h3>
              {(Object.keys(PAYMENT_INFO) as Method[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left",
                    method === m
                      ? "border-r-red bg-r-red/10 text-r-red"
                      : "border-r-border text-r-muted hover:text-r-text",
                  )}
                >
                  <span className="font-medium text-sm">
                    {PAYMENT_INFO[m].label}
                  </span>
                  {method === m && <span>✓</span>}
                </button>
              ))}
            </div>

            <button
              className="btn-primary"
              onClick={() => {
                if (validate()) setStep("payment");
              }}
            >
              CONTINUAR AL PAGO
            </button>
          </>
        )}

        {step === "payment" && (
          <>
            <div className="card space-y-3">
              <h3 className="font-semibold">{PAYMENT_INFO[method].label}</h3>
              <p className="text-r-muted text-sm">
                Realiza el pago de{" "}
                <span className="text-r-amber font-semibold">{price}</span> a:
              </p>
              <div className="bg-r-surf2 rounded-xl p-4 space-y-2.5">
                {PAYMENT_INFO[method].fields.map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-xs text-r-muted">{label}</span>
                    <span className="text-sm font-medium font-mono">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {method === "binance" && (
                <p className="text-xs text-r-amber">
                  💡 Envía exactamente 5 USDT usando Binance Pay con el ID
                  indicado.
                </p>
              )}
            </div>

            <div className="card space-y-3">
              <h3 className="font-semibold">Comprobante de pago</h3>
              <div>
                <label className="label">Número de referencia</label>
                <input
                  type="text"
                  className={clsx(
                    "input",
                    errors.payment_ref && "border-r-red",
                  )}
                  placeholder={
                    method === "binance"
                      ? "ID de transacción Binance"
                      : "Últimos 8 dígitos o referencia completa"
                  }
                  value={form.payment_ref}
                  onChange={set("payment_ref")}
                />
                {errors.payment_ref && (
                  <p className="text-r-red text-xs mt-1">
                    {errors.payment_ref}
                  </p>
                )}
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "ENVIANDO..." : "ENVIAR SOLICITUD"}
            </button>
            <button
              className="w-full text-sm text-r-muted py-2 hover:text-r-text transition-colors"
              onClick={() => setStep("form")}
            >
              ← Volver
            </button>
          </>
        )}
      </main>
    </div>
  );
}
