"use client";

import ScrollRiveAnimation from "./scroll-rive-animation";

export default function WhatIsLoopSection() {
  return (
    <section className="pt-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <div className="gap-8 flex flex-col">
            <div className="gap-2 w-full flex flex-col -mb-4">
              <span className="transition-opacity duration-150 ease-out text-blue-500 font-semibold gap-1.5 items-center flex">
                Que nos hace diferentes?
              </span>
              <h4 className="text-4xl leading-[54.4px] tracking-[-0.5px] font-bold m-0">
                Que es LOOP?
              </h4>
            </div>
            <p className="select-text cursor-default text-gray-600 text-pretty m-0">
              LOOP es nuestra solucion a los constantes cambios en el mundo de
              la inteligencia artificial, unificando en una sola plataforma
              todos los modelos de IA, brindando la oportunidad a los usuarios
              de no unicamente usar un modelo, sino de tener acceso a decenas de
              modelos, permitiendo al usuario crecer, tener mejores resultados y
              mejorar su experiencia.
            </p>
          </div>
        </div>
      </div>

      {/* Full-width animation container */}
      <div className="relative md:block hidden">
        <ScrollRiveAnimation
          src="https://xasvboifh2.ufs.sh/f/Eq6vxXhJeSPAqrrZ5gi0ZPwa4nG7Tv3DL26zopCgE918fchM"
          stateMachineName="State Machine 1"
          inputName="scroll"
          className="flex items-center justify-center pointer-events-none"
        />
      </div>
    </section>
  );
}
