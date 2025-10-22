"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon, BellIcon } from "@heroicons/react/24/outline";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "../client";
import { wallets } from "../wallets";
import { activeChain } from "../lib/chains";
import { SwitchTheme } from "./SwitchTheme";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { usePageView } from "~~/hooks/usePageView";

type HeaderMenuLink = {
  label: string;
  href: string;
};

const connectedMenuLinks: HeaderMenuLink[] = [
  {
    label: "Dashboard",
    href: "/",
  },
  {
    label: "My Sessions",
    href: "/sessions",
  },
  {
    label: 'Schedule',
    href: '/schedule'
  },
  {
    label: 'Debug',
    href: '/debug'
  }
];

const disconnectedMenuLinks: HeaderMenuLink[] = [
  {
    label: 'Home',
    href: '/'
  },
  {
    label: 'How it Works',
    href: '/'
  }
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const account = useActiveAccount();
  const { currentView, showHowItWorks, showHome } = usePageView();

  const handleHowItWorksClick = (e: React.MouseEvent) => {
    e.preventDefault();
    showHowItWorks();
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    showHome();
  };

  if (account) {
    // Connected state - show regular navigation
    return (
      <>
        {connectedMenuLinks.map(({ label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`${isActive ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-gray-300"
                } hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium`}
            >
              {label}
            </Link>
          );
        })}
      </>
    );
  }

  // Disconnected state - show custom navigation
  return (
    <>
      <button
        onClick={handleHomeClick}
        className={`${currentView === 'home' ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-gray-300"
          } hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium`}
      >
        Home
      </button>
      <button
        onClick={handleHowItWorksClick}
        className={`${currentView === 'how-it-works' ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-gray-300"
          } hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium`}
      >
        How it Works
      </button>
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  const account = useActiveAccount();
  const { showHome } = usePageView();
  
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  const handleLogoClick = (e: React.MouseEvent) => {
    if (!account) {
      e.preventDefault();
      showHome();
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <Link href="/" onClick={handleLogoClick} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">LangDAO</span>
            </Link>

            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              <HeaderMenuLinks />
            </nav>
          </div>

          {/* Right side - Theme, Notifications and Connect Button */}
          <div className="flex items-center space-x-4">
            <SwitchTheme />

            {account && (
              <button className="relative p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>
            )}

            <ConnectButton 
              client={client} 
              wallets={wallets}
              chain={activeChain}
              autoConnect={true}
            />
          </div>

          {/* Mobile menu button */}
          <details className="dropdown md:hidden" ref={burgerMenuRef}>
            <summary className="btn btn-ghost">
              <Bars3Icon className="h-6 w-6" />
            </summary>
            <ul className="menu dropdown-content mt-3 p-2 shadow bg-white dark:bg-gray-800 rounded-box w-52 right-0">
              <HeaderMenuLinks />
            </ul>
          </details>
        </div>
      </div>
    </header>
  );
};
