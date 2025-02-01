import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';


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
        <pre className="w-full p-2 bg-gray-900 border-1 border-gray-700 border-solid rounded-md">
          {JSON.stringify(state, null, 2)}
        </pre>
      )}
    </>
  );
}
