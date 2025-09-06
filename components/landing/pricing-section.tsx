import React from "react";
import Pricing from "./subcomponents/pricing";

const PricingSection = () => {
  return (
    <section>
      <div className="gap-8 flex flex-col">
        <div className="gap-2 w-full flex flex-col -mb-4">
          <span className="transition-opacity duration-150 ease-out text-emerald-500 font-semibold gap-1.5 items-center flex">
            Subscripcion
          </span>
          <h4 className="text-4xl leading-[54.4px] tracking-[-0.5px] font-bold m-0">
            Precios
          </h4>
        </div>
        <p className="text-[rgb(92,92,92)]">Escogle el plan que mas se adapte a tus requerimientos.</p>
        <Pricing />
      </div>
    </section>
  );
};

export default PricingSection;
