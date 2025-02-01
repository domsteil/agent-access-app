import React from 'react';

interface LandingLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  showFooter?: boolean;
}

const LandingLayout: React.FC<LandingLayoutProps> = ({ 
  children, 
  showNavbar = true, 
  showFooter = true 
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-stateset-blue-50 to-white">
      <main className="flex-grow overflow-auto">
        <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}

export default LandingLayout;