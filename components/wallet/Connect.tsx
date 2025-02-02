import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';

interface ConnectProps {
  sdk: ReturnType<typeof createCoinbaseWalletSDK>;
  onConnect: (address: string) => void;
}

export function Connect({ sdk, onConnect }: ConnectProps) {
  const [address, setAddress] = useState<string>();

  const handleConnect = useCallback(async () => {
    if (!sdk) return;

    try {
      const provider = sdk.getProvider();
      const response = await provider.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (response?.[0]) {
        setAddress(response[0]);
        onConnect(response[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  }, [sdk, onConnect]);

  const handleDisconnect = useCallback(() => {
    setAddress(undefined);
    onConnect('');
  }, [onConnect]);

  if (address) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-gray-600">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={handleDisconnect}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
    >
      Connect Wallet
    </button>
  );
}