export default function IntegrationsPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600 mb-8">
          Connect your workspace with external tools and services to enhance productivity.
        </p>

        <div className="space-y-8">
          {/* Popular Integrations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Popular Integrations</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94L2.36 9.75c.16-.5.61-.84 1.13-.84h17.02c.52 0 .97.34 1.13.84l1.31 3.7c.16.45.04.84-.3.94z"/>
                    </svg>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Slack</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Sync messages and notifications with your Slack workspace
                </p>
                <button className="text-sm text-red-600 hover:text-red-700">
                  Disconnect
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.752-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-12.014C24.007 5.36 18.641.001 12.017.001z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">Available</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">GitHub</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Track issues and pull requests from your repositories
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Connect
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169-.224-.24-.492-.194-.776l.194-1.446c.046-.284-.098-.568-.353-.698-.255-.13-.555-.082-.738.116L14.7 6.85c-.183.198-.183.52 0 .718l1.777 1.494c.183.198.483.246.738.116.255-.13.399-.414.353-.698l-.194-1.446c-.046-.284.025-.552.194-.776.374-.497.374-1.204 0-1.701-.374-.497-.982-.497-1.356 0-.374.497-.374 1.204 0 1.701zm-3.568 6.84c-.169-.224-.169-.552 0-.776.374-.497.374-1.204 0-1.701-.374-.497-.982-.497-1.356 0-.374.497-.374 1.204 0 1.701.169.224.169.552 0 .776-.374.497-.374 1.204 0 1.701.374.497.982.497 1.356 0 .374-.497.374-1.204 0-1.701z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">Available</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Figma</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Embed and share design files directly in conversations
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Connect
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">Available</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Trello</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Create and manage Trello cards from your workspace
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Connect
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">Available</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Notion</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Link and embed Notion pages and databases
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Connect
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500">Available</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">LinkedIn</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Share updates and sync professional contacts
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Connect
                </button>
              </div>
            </div>
          </div>

          {/* Webhooks */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Webhooks</h2>
            <p className="text-gray-600 mb-4">
              Configure webhooks to receive real-time notifications from external services.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Project Updates</h3>
                  <p className="text-sm text-gray-500">https://api.example.com/webhooks/project-updates</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <button className="mt-4 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Add Webhook
            </button>
          </div>

          {/* API Keys */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">API Keys</h2>
            <p className="text-gray-600 mb-4">
              Manage API keys for external integrations and custom applications.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Production API Key</h3>
                  <p className="text-sm text-gray-500 font-mono">ak_prod_••••••••••••••••••••••••••••••••</p>
                  <p className="text-xs text-gray-400 mt-1">Last used: 2 hours ago</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
                    Copy
                  </button>
                  <button className="px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50">
                    Revoke
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Development API Key</h3>
                  <p className="text-sm text-gray-500 font-mono">ak_dev_••••••••••••••••••••••••••••••••</p>
                  <p className="text-xs text-gray-400 mt-1">Last used: 1 day ago</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
                    Copy
                  </button>
                  <button className="px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50">
                    Revoke
                  </button>
                </div>
              </div>
            </div>
            <button className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Generate New Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
