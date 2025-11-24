export default function WhatIsRIFTSection() {
  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 pt-24 md:pt-0">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 w-full -mb-4">
          <span className="transition-opacity duration-150 ease-out text-blue-500 font-semibold gap-1.5 items-center flex">
            Plataforma de IA?
          </span>
          <h2 id="about-heading" className="text-4xl leading-[54.4px] tracking-[-0.5px] font-bold m-0">
            Que es RIFT?
          </h2>
        </div>
        <p className="text-landing-text-secondary select-text text-gray-600 text-pretty m-0">
          RIFT es nuestra solucion a los <strong className="font-bold text-gray-900 dark:text-gray-100">constantes cambios en el mundo de la inteligencia artificial</strong>, <strong className="font-bold text-gray-900 dark:text-gray-100">unificando en una sola plataforma</strong>
          <strong className="font-bold text-gray-900 dark:text-gray-100"> todos los modelos de IA</strong>, brindando la oportunidad a los usuarios de no unicamente usar un modelo, sino de tener acceso a <strong className="font-bold text-gray-900 dark:text-gray-100">decenas de
          modelos</strong>, permitiendo al usuario <strong className="font-bold text-gray-900 dark:text-gray-100">crecer, tener mejores resultados y mejorar su experiencia</strong>.
        </p>
      </div>
    </section>
  );
}
