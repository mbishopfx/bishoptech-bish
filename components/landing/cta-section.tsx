import Link from "next/link";

export default function CTASection() {
  return (
    <section 
      className="relative overflow-hidden bg-gradient-to-b from-blue-800 via-blue-500 to-blue-400 py-12 sm:py-16 md:py-20 rounded-2xl sm:rounded-3xl mx-4 sm:mx-0"
    >
      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
          ¿Listo para comenzar?
        </h2>
        
        <p className="text-lg sm:text-xl md:text-2xl leading-6 sm:leading-7 md:leading-8 text-white/90 max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-12">
          Prueba LOOP gratis. No se requiere tarjeta de crédito.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-md mx-auto">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <button className="flex items-center justify-center gap-2 h-11 sm:h-12 px-6 sm:px-8 py-3 sm:py-6 bg-white text-blue-600 font-medium text-base sm:text-lg leading-6 sm:leading-7 rounded-full whitespace-nowrap transition-all duration-150 ease-in-out hover:bg-gray-50 w-full">
              Suscribirse
            </button>
          </Link>

          <Link href="#demo" className="w-full sm:w-auto">
            <button className="flex items-center justify-center gap-2 h-11 sm:h-12 px-6 sm:px-8 py-3 sm:py-6 bg-white text-blue-600 font-medium text-base sm:text-lg leading-6 sm:leading-7 rounded-full whitespace-nowrap transition-all duration-150 ease-in-out hover:bg-gray-50 w-full">
              Probar demo
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
