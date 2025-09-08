"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import {
  Users,
  Home,
  ReceiptText,
  Key,
  MessageSquare,
  Bot,
  Lightbulb,
  Palette,
  Target,
  Bell,
  Mail,
  LogOut,
  Shield,
} from "lucide-react";
import { OrganizationSwitcherClient } from "./OrganizationSwitcherClient";
interface SettingsNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsSection {
  title: string;
  items: SettingsNavItem[];
}

// Inline components to avoid import issues
function SettingItem({ 
  title, 
  href, 
  icon: Icon, 
  onClick, 
  isLogout = false 
}: {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  isLogout?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const baseClasses = `
    w-full flex items-center px-2 py-1.5 mb-0.5 rounded-lg text-sm font-medium
    ${isLogout 
      ? 'text-red-600 hover:bg-red-50' 
      : isActive 
        ? 'text-gray-900 bg-gray-200' 
        : 'text-gray-600 hover:bg-hover'
    }
  `;

  const iconClasses = `
    w-5 h-5 mr-2 flex-shrink-0
    ${isLogout 
      ? 'text-red-500' 
      : isActive 
        ? 'text-gray-700' 
        : 'text-gray-500'
    }
  `;

  const content = (
    <button
      className={baseClasses}
      onClick={onClick}
      type={isLogout ? "button" : undefined}
    >
      <Icon className={iconClasses} />
      <span className="flex-1 text-left truncate">{title}</span>
    </button>
  );

  if (isLogout || onClick) {
    return content;
  }

  return (
    <Link href={href}>
      {content}
    </Link>
  );
}

function SettingSection({ title, items, isLast = false }: {
  title: string;
  items: SettingsNavItem[];
  isLast?: boolean;
}) {
  return (
    <div className="">
      <span className="text-xs font-semibold text-gray-500 px-2 py-1.5 mt-4 mb-1.5 block">
        {title}
      </span>
      
      {items.map((item) => (
        <SettingItem
          key={item.href}
          title={item.title}
          href={item.href}
          icon={item.icon}
        />
      ))}

      {!isLast && (
        <div className="px-2 my-4">
          <hr className="border-gray-200" />
        </div>
      )}
    </div>
  );
}

const settingsSections: SettingsSection[] = [
  {
    title: "Organization Settings",
    items: [
      {
        title: "Overview",
        href: "/settings",
        icon: Home,
      },
      {
        title: "Members",
        href: "/settings/members",
        icon: Users,
      },
      {
        title: "Plans",
        href: "/settings/plans",
        icon: ReceiptText,
      },
    ],
  },
  {
    title: "Personal Settings",
    items: [
      {
        title: "Profile",
        href: "/settings/profile",
        icon: Users,
      },
      {
        title: "Security",
        href: "/settings/security",
        icon: Shield,
      },
      {
        title: "API Keys",
        href: "/settings/api-keys",
        icon: Key,
      },
    ],
  },
  {
    title: "App Settings",
    items: [
      {
        title: "Responses",
        href: "/settings/responses",
        icon: MessageSquare,
      },
      {
        title: "Models",
        href: "/settings/models",
        icon: Bot,
      },
      {
        title: "Tips",
        href: "/settings/tips",
        icon: Lightbulb,
      },
      {
        title: "Appearance",
        href: "/settings/appearance",
        icon: Palette,
      },
      {
        title: "Shortcuts",
        href: "/settings/shortcuts",
        icon: Target,
      },
    ],
  },
];

const footerItems: SettingsNavItem[] = [
  {
    title: "Updates",
    href: "/settings/updates",
    icon: Bell,
  },
  {
    title: "Contact us",
    href: "/settings/contact-us",
    icon: Mail,
  },
];
export function SettingsSidebar() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="w-80 bg-background-settings h-screen overflow-y-auto scrollbar-hide select-none pr-6">
      <nav className="py-12 flex flex-col w-48 ml-auto">
        <div className="relative">
          <ul className="flex flex-col -mt-1.5 list-none p-0">
            {/* Organization Header Button */}
            <OrganizationSwitcherClient />
            {/* Navigation Sections */}
            {settingsSections.map((section, sectionIndex) => (
              <SettingSection
                key={section.title}
                title={section.title}
                items={section.items}
                isLast={sectionIndex === settingsSections.length - 1}
              />
            ))}

            {/* Footer Divider */}
            <div className="px-2 my-2.5">
              <hr className="border-gray-200" />
            </div>

            {/* Footer Items */}
            {footerItems.map((item) => (
              <SettingItem
                key={item.href}
                title={item.title}
                href={item.href}
                icon={item.icon}
              />
            ))}

            {/* Final Divider */}
            <div className="px-2 my-2.5">
              <hr className="border-gray-200" />
            </div>

            {/* Logout Button */}
            <SettingItem
              title="Log out"
              href="#"
              icon={LogOut}
              onClick={handleLogout}
              isLogout={true}
            />
          </ul>
        </div>
      </nav>
    </div>
  );
}