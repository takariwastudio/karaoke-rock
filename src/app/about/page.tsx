export default function AboutPage() {
  return (
    <div className="min-h-screen bg-r-bg text-r-text">
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="font-display text-5xl tracking-[4px] mb-4">
          KARAOKE <span className="text-r-red">ROCK</span>
        </h1>
        <p className="text-r-muted text-sm mb-12">Maracay, Venezuela</p>

        <div className="space-y-6 text-left">
          <div className="card">
            <h2 className="font-semibold mb-2">¿Qué es Karaoke Rock?</h2>
            <p className="text-r-muted text-sm leading-relaxed">
              Karaoke Rock es una aplicación web para eventos de karaoke en
              vivo. Los asistentes pueden pedir canciones, ver la lista de
              espera en tiempo real y calificar a los cantantes de la noche.
            </p>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-2">¿Cómo funciona?</h2>
            <p className="text-r-muted text-sm leading-relaxed">
              Entra con tu cuenta de Google, busca tu canción favorita en
              Spotify, agrégala a la lista y espera tu turno. Mientras tanto,
              vota por los cantantes que más te gusten.
            </p>
          </div>
        </div>

        <div className="mt-12 flex justify-center gap-6 text-xs text-r-muted">
          <a href="/privacy" className="hover:text-r-text transition-colors">
            Privacidad
          </a>
          <a href="/terms" className="hover:text-r-text transition-colors">
            Términos
          </a>
          <a href="/" className="hover:text-r-text transition-colors">
            Entrar
          </a>
        </div>
      </div>
    </div>
  );
}
