import { AppLogo } from "@/components/ui/icons/svg-icons";
import NavbarAuthButtons from "./navbar-auth-buttons";

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <AppLogo className="h-8 w-auto" />
          </div>

          {/* Auth buttons */}
          <NavbarAuthButtons />
        </div>
      </div>
    </header>
  );
}
