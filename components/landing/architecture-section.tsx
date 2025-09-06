import {
  FastMessagesIcon,
  AIModelsIcon,
  CentroConocimientoIcon,
  TeamsIcon,
  SSOIcon,
} from "@/components/ui/icons/landing-icons";

export default function ArchitectureSection() {
  return (
    <section className="pt-24 md:pt-0">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 w-full -mb-4">
          <span className="text-[rgb(1,202,69)] font-semibold gap-1.5 flex items-center transition-opacity duration-150">
            Arquitectura
          </span>
          <h4 className="text-[40px] leading-[54.4px] tracking-[-0.5px] font-bold m-0">
            Por que somos diferentes
          </h4>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <FastMessagesIcon className="w-12 h-12 text-amber-500" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <h4 className="tracking-[-0.5px] font-semibold text-xl leading-7 m-0">
              Respuestas Rápidas
            </h4>
            <p className="text-[rgb(92,92,92)] m-0">
              Cuando tu mandas un mensaje, LOOP se encarga de contrar el servidor de
              IA mas rapido disponible en el momento para responder a tu mensaje en
              question de milisegundos.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AIModelsIcon className="w-12 h-12 text-blue-500" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <h4 className="tracking-[-0.5px] font-semibold text-xl leading-7 m-0">
              Todos los Modelos de IA en un solo lugar
            </h4>
            <p className="text-[rgb(92,92,92)] m-0">
              Con LOOP no necesitar preocuparte por tener que pagar, administrar y
              configurar varias paginas de IA, simplemente usa LOOP y disfruta de la
              experiencia de IA sin preocupaciones.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <CentroConocimientoIcon className="w-12 h-12 text-purple-500" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <h4 className="tracking-[-0.5px] font-semibold text-xl leading-7 m-0">
              Centro de Conocimiento incluido
            </h4>
            <p className="text-[rgb(92,92,92)] m-0">
              En tu subscripcion, incluimos un centro de conocimiento donde
              encontraras recursos para aprender y mejorar tus habilidades de IA,
              incluyendo tutoriales, cursos, guias y explicaciones de como realmente
              funciona la inteligencia artificial permitiendote conocer las
              limitaciones, tecnicas y estrategias para obtener los mejores
              resultados.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <TeamsIcon className="w-12 h-12 text-emerald-500" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <h4 className="tracking-[-0.5px] font-semibold text-xl leading-7 m-0">
              Listo para Organizaciones
            </h4>
            <p className="text-[rgb(92,92,92)] m-0">
              Da acceso a los miembros de tu organizacion en cuestion de minutos
              vinculando tu Google Workspace, Microsoft Teams y muchas plataformas,
              mediante guias y tutoriales
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <SSOIcon className="w-12 h-12 text-slate-600" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <h4 className="tracking-[-0.5px] font-semibold text-xl leading-7 m-0">
              Integraciones Avanzadas
            </h4>
            <p className="text-[rgb(92,92,92)] m-0">
              contamos con SCIM, JIT, Directory Sync, SSO/SAML/OIDC, audit logs y
              muchas mas funcionalidades para organizaciones
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
