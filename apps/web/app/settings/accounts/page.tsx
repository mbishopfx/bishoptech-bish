export default function AccountsPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Accounts</h1>
        <p className="text-gray-600 mb-8">
          Manage your connected accounts and security settings.
        </p>

        <div className="space-y-8">
          {/* Connected Accounts */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Connected Accounts</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Google</h3>
                    <p className="text-sm text-gray-500">arisay@gmail.com</p>
                  </div>
                </div>
                <button className="text-sm text-red-600 hover:text-red-700">
                  Disconnect
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.752-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-12.014C24.007 5.36 18.641.001 12.017.001z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Pinterest</h3>
                    <p className="text-sm text-gray-500">Not connected</p>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Connect
                </button>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Security</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Two-factor authentication</h3>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Enable
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Change Password</h3>
                  <p className="text-sm text-gray-500">Update your password regularly for better security</p>
                </div>
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Login Sessions</h3>
                  <p className="text-sm text-gray-500">Manage your active sessions across devices</p>
                </div>
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                  Manage
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg border border-red-200 p-6">
            <h2 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Delete Account</h3>
                  <p className="text-sm text-gray-500">Permanently delete your account and all associated data</p>
                </div>
                <button className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
