import { TablerBrandOpenai } from "@/components/ui/icons/openai-icon";
import { GoogleIcon } from "@/components/ui/icons/google-icon";
import { AnthropicIcon } from "@/components/ui/icons/anthropic-icon";
import { XAiIcon } from "@/components/ui/icons/xai-icon";
import { LogosMistralAiIcon } from "@/components/ui/icons/mistral-icon";
import { 
  AIModelsIcon, 
  GuiasAIIcon, 
  CentroConocimientoIcon, 
  SoporteIcon, 
  FastMessagesIcon,
  EarlyAccessIcon,
  OnboardingIcon,
  DirectorySyncIcon,
  SSOIcon,
  LogsIcon,
  StandarIcon,
  PremiumIcon,
  TeamsIcon
} from "@/components/ui/icons/landing-icons";

export default function Pricing() {
  return (
    <div className="mx-auto">
      
      {/* Pricing Cards */}
      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Plus Plan */}
          <div className="border-r border-gray-200 py-10 px-8">
            <div className="min-h-[304px]">
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Plus</h3>
              <p className="text-sm text-gray-600 mt-2">Perfecto para la mayor parte de los usuarios</p>
                <div className="mt-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900 tracking-tight">$190</span>
                    <span className="ml-2 text-lg font-medium text-gray-600">MXN</span>
                  </div>
                <div className="mt-1">
                  <p className="text-xs text-gray-500">por usuario/mes</p>
                </div>
              </div>
              <button className="w-full mt-6 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors duration-200">
                Suscribir
              </button>
            </div>
            <hr className="border-gray-200 my-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700 mt-4">Una cuenta con:</p>
              <ul className="text-sm mt-4 space-y-2">
                <li className="flex items-center gap-2">
                  <AIModelsIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Acesso a todos los modelos de IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <StandarIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">500 Mensajes standar al mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <PremiumIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">100 Mensajes Premium al mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <GuiasAIIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Guias de uso de IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <CentroConocimientoIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Centro de conocimiento IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <SoporteIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Soporte tecnico</span>
                </li>
                <li className="flex items-center gap-2">
                  <FastMessagesIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Mensajes super veloces</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="relative border-r border-gray-200 py-10 px-8 bg-gradient-to-br from-white to-gray-50 shadow-lg shadow-gray-200/50 ring-1 ring-gray-200/50">
            {/* Best Value Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
              <span className="bg-accent/75 backdrop-blur-sm text-white text-xs font-semibold px-2 sm:px-3 py-1 rounded-full shadow-lg shadow-accent/25 border border-accent/30 whitespace-nowrap">
                Mejor Opción
              </span>
            </div>
            <div className="min-h-[304px]">
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Pro</h3>
              <p className="text-sm text-gray-600 mt-2">Para aquellos que necesitan mas mensajes</p>
              <div className="mt-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900 tracking-tight">$540</span>
                  <span className="ml-2 text-lg font-medium text-gray-600">MXN</span>
                </div>
                <div className="mt-1">
                  <p className="text-xs text-gray-500">por usuario/mes</p>
                </div>
              </div>
              <button className="w-full mt-6 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors duration-200">
                Suscribir
              </button>
            </div>
            <hr className="border-gray-200 my-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700 mt-4">Todo lo que incluye el plan Plus, mas:</p>
              <ul className="text-sm mt-4 space-y-2">
                <li className="flex items-center gap-2">
                  <StandarIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">700 Mensajes Standar totales al mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <PremiumIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">300 Mensajes Premium totales al mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <EarlyAccessIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Acesso anticipado a nuevas funciones</span>
                </li>
                <li className="flex items-center gap-2">
                  <SoporteIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Soporte prioritario</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="py-10 px-8">
            <div className="min-h-[304px]">
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Organizacion</h3>
              <p className="text-sm text-gray-600 mt-2">Planes dedicados para organizaciones con funcionalidades avanzadas</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-gray-900 tracking-tight">Custom</span>
                <div className="mt-1">
                  <p className="text-xs text-gray-500">Contactanos para un presupuesto</p>
                </div>
              </div>
              <button className="w-full mt-6 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors duration-200">
                Contactar
              </button>
            </div>
            <hr className="border-gray-200 my-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700 mt-4">Limites de mensajes personalizados para cada organizacion</p>
              <ul className="text-sm mt-4 space-y-2">
                <li className="flex items-center gap-2">
                  <OnboardingIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Onboarding personalizado</span>
                </li>
                <li className="flex items-center gap-2">
                  <TeamsIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Creacion de equipos y gestion de usuarios</span>
                </li>
                <li className="flex items-center gap-2">
                  <DirectorySyncIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">SCIM y Directory Sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <SSOIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">SSO/SAML/OIDC</span>
                </li>
                <li className="flex items-center gap-2">
                  <LogsIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Audit logs</span>
                </li>
                <li className="flex items-center gap-2">
                  <SoporteIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">Soporte Exclusivo</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Title Section */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mt-10">Comparación de Precios</h3>
        <p className="text-gray-600">Compara nuestros precios con las suscripciones individuales</p>
      </div>

      {/* Comparison Table */}
      <div className="max-w-4xl mx-auto">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Servicio</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900">LOOP Plus</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900">Suscripciones Individuales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">L</span>
                    </div>
                    <span className="font-medium text-gray-900">LOOP Plus</span>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-xl font-bold text-gray-900">$190 MXN</span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-gray-900">$0 MXN</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <TablerBrandOpenai className="w-6 h-6 text-green-600" />
                    <span className="font-medium text-gray-900">ChatGPT Plus</span>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-green-600">$0 MXN</span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-gray-900">$400 MXN</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <XAiIcon className="w-6 h-6 text-black" />
                    <span className="font-medium text-gray-900">Grok Pro</span>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-green-600">$0 MXN</span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-gray-900">$600 MXN</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <GoogleIcon className="w-6 h-6 text-purple-600" />
                    <span className="font-medium text-gray-900">Gemini Advanced</span>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-green-600">$0 MXN</span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-gray-900">$400 MXN</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <AnthropicIcon className="w-6 h-6 text-black" />
                    <span className="font-medium text-gray-900">Claude Pro</span>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-green-600">$0 MXN</span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-gray-900">$400 MXN</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <LogosMistralAiIcon className="w-6 h-6 text-orange-500" />
                    <span className="font-medium text-gray-900">Mistral AI</span>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-green-600">$0 MXN</span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-lg font-bold text-gray-900">$300 MXN</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="py-4 px-4 font-bold text-gray-900">Total</td>
                <td className="text-center py-4 px-4">
                  <span className="text-2xl font-bold text-green-600">$190 MXN</span>
                </td>
                <td className="text-center py-4 px-4">
                  <span className="text-2xl font-bold text-gray-900">$2,100 MXN</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Savings Highlight */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span className="font-semibold text-green-800">Ahorro con LOOP</span>
          </div>
          <p className="text-sm text-green-700">
            Con LOOP Plus obtienes acceso a todos estos modelos por solo $190 MXN/mes. 
            <span className="font-semibold"> Ahorras $1,910 MXN/mes</span> comparado con las suscripciones individuales.
          </p>
        </div>
      </div>
    </div>
  );
}
