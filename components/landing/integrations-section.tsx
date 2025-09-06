import { Google, Microsoft, Okta, Scim } from "@/components/ui/icons/svg-icons";

export default function IntegrationsSection() {
  return (
    <section>
      <div className=" gap-8 flex flex-col">
        <div className="gap-2 w-full flex flex-col -mb-4">
          <span className="transition-opacity duration-150 ease-out text-orange-500 font-semibold gap-1.5 items-center flex">
            Integraciones
          </span>
          <h4 className="text-4xl leading-[54.4px] tracking-[-0.5px] font-bold m-0">
            Conecta a LOOP con tu organizacion
          </h4>
        </div>

        <p className="text-[rgb(92,92,92)]">
          En cuestion de minutos puedes conectar a los usuarios de tu
          organizacion en LOOP para que tengan acceso a la plataforma sin
          necesidad de crear invitaciones manuales, estar lidiando con base de
          datos y tener que dar de baja a los usuarios que ya no son parte de tu
          organización.
        </p>
        <p className="text-[rgb(92,92,92)] mb-6">
          Contamos con mas de 30 Integraciones y opcion para activar registros
          de actividad avanzados para tu organizacion (Okta, Azure AD, Google
          Workspace SCIM, SIEM, Directory Sync, JIT, SSO: SAML 2.0, OIDC, entre
          otras)
        </p>
        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-items-center">
            <div className="flex items-center justify-center p-2">
              <Google className="h-8 w-auto" />
            </div>
            <div className="flex items-center justify-center p-2">
              <Microsoft className="h-8 w-auto" />
            </div>
            <div className="flex items-center justify-center p-2">
              <Okta className="h-8 w-auto" />
            </div>
            <div className="flex items-center justify-center p-2">
              <Scim className="h-8 w-auto text-gray-700" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
