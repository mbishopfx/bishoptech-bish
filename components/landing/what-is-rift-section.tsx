"use client";

import ScrollRiveAnimation from "./scroll-rive-animation";

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
          RIFT es nuestra solucion a los constantes cambios en el mundo de la inteligencia artificial, unificando en una sola plataforma
          todos los modelos de IA, brindando la oportunidad a los usuarios de no unicamente usar un modelo, sino de tener acceso a decenas de
          modelos, permitiendo al usuario crecer, tener mejores resultados y mejorar su experiencia.
        </p>
      </div>

      {/* Full-width animation container */}
      {/* <div className="relative md:block hidden">
        <ScrollRiveAnimation
          src="https://xasvboifh2.ufs.sh/f/Eq6vxXhJeSPAqrrZ5gi0ZPwa4nG7Tv3DL26zopCgE918fchM"
          stateMachineName="State Machine 1"
          inputName="scroll"
          className="flex items-center justify-center pointer-events-none"
        />
      </div> */}
    </section>
  );
}
