export default function TermsPage() {
  return (
    <div className="min-h-screen bg-r-bg text-r-text">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="font-display text-4xl tracking-[3px] mb-2">
            TÉRMINOS DE <span className="text-r-red">SERVICIO</span>
          </h1>
          <p className="text-r-muted text-sm">
            Última actualización: septiembre 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              1. Aceptación
            </h2>
            <p className="text-r-muted">
              Al usar Karaoke Rock, aceptas estos términos. Si no estás de
              acuerdo, no uses la aplicación. Esta app está diseñada
              exclusivamente para su uso durante eventos de Karaoke Rock en
              Maracay, Venezuela.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              2. Uso del servicio
            </h2>
            <p className="text-r-muted">Karaoke Rock te permite:</p>
            <ul className="text-r-muted mt-2 space-y-1 list-disc list-inside">
              <li>Solicitar canciones para cantar durante el evento</li>
              <li>Ver la lista de espera de cantantes</li>
              <li>Calificar a otros cantantes con estrellas</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              3. Conducta del usuario
            </h2>
            <p className="text-r-muted">
              Al usar la aplicación te comprometes a:
            </p>
            <ul className="text-r-muted mt-2 space-y-1 list-disc list-inside">
              <li>Usar tu nombre real o un apodo apropiado</li>
              <li>
                No intentar manipular la lista de espera o el sistema de
                votación
              </li>
              <li>
                Respetar el turno asignado — no presentarte al micrófono
                compromete tu lugar
              </li>
              <li>No usar la app para fines distintos al evento</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              4. Suspensión de cuenta
            </h2>
            <p className="text-r-muted">
              El organizador del evento se reserva el derecho de suspender
              cuentas de usuarios que hagan mal uso de la aplicación, sin previo
              aviso. Las decisiones del DJ o administrador del evento son
              definitivas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              5. Disponibilidad
            </h2>
            <p className="text-r-muted">
              Karaoke Rock es un servicio operado durante eventos específicos.
              No garantizamos disponibilidad continua fuera de los horarios del
              evento. El servicio puede ser interrumpido sin previo aviso.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              6. Propiedad intelectual
            </h2>
            <p className="text-r-muted">
              La búsqueda de canciones utiliza la API de Spotify. Los nombres,
              portadas y metadatos de canciones son propiedad de sus respectivos
              titulares. Karaoke Rock no almacena ni distribuye contenido
              musical protegido.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              7. Limitación de responsabilidad
            </h2>
            <p className="text-r-muted">
              Karaoke Rock se provee "tal cual". No nos hacemos responsables por
              interrupciones del servicio, pérdida de datos, o cualquier daño
              derivado del uso de la aplicación.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              8. Cambios a los términos
            </h2>
            <p className="text-r-muted">
              Nos reservamos el derecho de actualizar estos términos. Los
              cambios serán publicados en esta página con la fecha de
              actualización.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-3 text-r-text">
              9. Contacto
            </h2>
            <p className="text-r-muted">
              Para consultas sobre estos términos:{" "}
              <span className="text-r-text">takariwastudio@gmail.com</span>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-r-border">
          <a
            href="/"
            className="text-r-muted hover:text-r-text text-sm transition-colors"
          >
            ← Volver a Karaoke Rock
          </a>
        </div>
      </div>
    </div>
  );
}
