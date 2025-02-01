'use client';

import { CoinbaseWalletProvider, createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useEffect, useState } from 'react';

import { CBWSDKReactContextProvider } from '@/context/CBWSDKReactContextProvider';

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

  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK>>();

  useEffect(() => {
    const sdk = createCoinbaseWalletSDK({
      appName: 'Agent Access',
      preference: {
        options: 'smartWalletOnly',
      },
    });

    if (!sdk) {
      return;
    }

    setSDK(sdk);
    const provider = sdk.getProvider();

    provider.on('accountsChanged', (accounts) => {
      console.info('customlogs: accountsChanged', accounts);
    });
  }, []);

  return (
    <CBWSDKReactContextProvider>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-stateset-blue-50 to-white">
        <main className="flex-grow overflow-auto">
          <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {children}
          </div>
        </main>
      </div>
    </CBWSDKReactContextProvider>
  );
}

export default LandingLayout;