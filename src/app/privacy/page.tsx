export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-r-bg text-r-text">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="mb-10">
          <h1 className="font-display text-4xl tracking-[3px] mb-2">
            POLÍTICA DE <span className="text-r-red">PRIVACIDAD</span>
          </h1>
          <p className="text-r-muted text-sm">Última actualización: septiembre 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">1. Información que recopilamos</h2>
            <p className="text-r-muted">
              Karaoke Rock recopila únicamente la información necesaria para el funcionamiento
              del servicio. Al iniciar sesión con Google, obtenemos tu nombre y foto de perfil
              asociados a tu cuenta de Google. No accedemos a tu correo electrónico, contactos,
              ni ningún otro dato de tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">2. Cómo usamos tu información</h2>
            <p className="text-r-muted">Tu nombre y foto se usan exclusivamente para:</p>
            <ul className="text-r-muted mt-2 space-y-1 list-disc list-inside">
              <li>Identificarte en la lista de espera del evento</li>
              <li>Mostrar tu perfil a otros asistentes del evento</li>
              <li>Registrar tus solicitudes de canciones y calificaciones</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">3. Almacenamiento de datos</h2>
            <p className="text-r-muted">
              Los datos se almacenan en servidores de Supabase (supabase.com) con cifrado
              en tránsito y en reposo. Los datos de cada evento se conservan por un período
              máximo de 30 días después de finalizado el evento.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">4. Compartir información</h2>
            <p className="text-r-muted">
              No vendemos, alquilamos ni compartimos tu información personal con terceros.
              Tu nombre y calificaciones son visibles para otros asistentes del evento dentro
              de la aplicación durante la duración del mismo.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">5. Servicios de terceros</h2>
            <p className="text-r-muted">
              Utilizamos los siguientes servicios de terceros:
            </p>
            <ul className="text-r-muted mt-2 space-y-1 list-disc list-inside">
              <li>Google OAuth — autenticación de usuarios</li>
              <li>Supabase — base de datos y almacenamiento</li>
              <li>Spotify API — búsqueda de canciones (solo lectura, no accedemos a tu cuenta de Spotify)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">6. Tus derechos</h2>
            <p className="text-r-muted">
              Puedes solicitar la eliminación de tus datos en cualquier momento contactándonos.
              También puedes cerrar sesión desde tu perfil, lo cual desvincula tu acceso a la app.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">7. Contacto</h2>
            <p className="text-r-muted">
              Para cualquier consulta sobre privacidad, contáctanos en{' '}
              <span className="text-r-text">takariwastudio@gmail.com</span>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-r-border">
          <a href="/" className="text-r-muted hover:text-r-text text-sm transition-colors">
            ← Volver a Karaoke Rock
          </a>
        </div>

      </div>
    </div>
  )
}