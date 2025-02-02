import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';

// Connect Wallet Component
export function Connect({ sdk }: { sdk: ReturnType<typeof createCoinbaseWalletSDK> }) {


  const [state, setState] = useState<string[]>();
  const handleConnect = useCallback(async () => {
    if (!sdk) {
      return;
    }

    const provider = sdk.getProvider();
    const response = await provider.request({
      method: 'eth_requestAccounts',
    });

    console.info('customlogs: response', response);
    setState(response as string[]);
  }, [sdk]);

  return (
    <>
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors self-start" onClick={handleConnect}>
        Connect
      </button>
      {state && (
        <pre className="w-full p-2 bg-white border-1 border-white text-green-500 border-solid rounded-md">
          {state[0]}
        </pre>
      )}
    </>
  );
}
