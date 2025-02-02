import { CoinbaseWalletSDK, Preference } from '@coinbase/wallet-sdk';
import latestPkgJson from '@coinbase/wallet-sdk/package.json';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

// Type declarations for window.ethereum and related interfaces
declare global {
  interface Window {
    setPopupUrl: (url: string) => void;
    ethereum?: {
      communicator?: {
        url: URL;
      };
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      on(event: string, callback: (...args: any[]) => void): void;
      off(event: string, callback: (...args: any[]) => void): void;
      request(args: { method: string; params?: any[] }): Promise<any>;
      disconnect?(): void;
    };
  }
}

// Provider Props
type CBWSDKProviderProps = {
  children: React.ReactNode;
};

// Context Type
type CBWSDKContextValue = {
  sdk: any;
  provider: any;
  option: OptionsType;  // Remove undefined since we always have a default
  setPreference: (option: OptionsType) => void;
  sdkVersion: SDKVersionType | undefined;
  setSDKVersion: (version: SDKVersionType) => void;
  scwUrl: ScwUrlType | undefined;
  setScwUrlAndSave: (url: ScwUrlType) => void;
  config: Preference;
  setConfig: React.Dispatch<React.SetStateAction<Preference>>;
} | null;

// Constants and their types
const SELECTED_SDK_KEY = 'selected_sdk_version';
const SELECTED_SCW_URL_KEY = 'scw_url';
const OPTIONS_KEY = 'option_key';

export const sdkVersions = ['HEAD', latestPkgJson.version, '3.9.3', '3.7.2'] as const;
export type SDKVersionType = typeof sdkVersions[number];

export const scwUrls = [
  'https://keys.coinbase.com/connect',
  'https://keys-beta.coinbase.com/connect',
  'https://keys-dev.coinbase.com/connect',
  'http://localhost:3005/connect',
] as const;
export type ScwUrlType = typeof scwUrls[number];

export const options = ['all', 'smartWalletOnly', 'eoaOnly'] as const;
export type OptionsType = typeof options[number];

// Create the context
const CBWSDKReactContext = React.createContext<CBWSDKContextValue>(null);

// Initialize window.setPopupUrl
if (typeof window !== 'undefined') {
  window.setPopupUrl = (url: string) => {
    if (window.ethereum?.communicator) {
      window.ethereum.communicator.url = new URL(url);
    }
  };
}

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const previousScwUrlRef = useRef<ScwUrlType | undefined>();
  const [version, setVersion] = React.useState<SDKVersionType | undefined>(undefined);
  const [option, setOption] = React.useState<OptionsType>('all'); // Set default value
  const [config, setConfig] = React.useState<Preference>({
    options: 'all', // Use literal default value
    attribution: {
      auto: false,
    },
  });
  const [sdk, setSdk] = React.useState<any>(null);
  const [provider, setProvider] = React.useState<any>(null);
  const [scwUrl, setScwUrl] = React.useState<ScwUrlType | undefined>(undefined);

  // Load saved version
  useEffect(() => {
    if (version === undefined) {
      const savedVersion = localStorage.getItem(SELECTED_SDK_KEY) as SDKVersionType;
      setVersion(
        sdkVersions.includes(savedVersion) ? savedVersion : sdkVersions[0]
      );
    }
  }, [version]);

  // Load saved option
  useEffect(() => {
    const savedOption = localStorage.getItem(OPTIONS_KEY);
    if (savedOption && options.includes(savedOption as OptionsType)) {
      setOption(savedOption as OptionsType);
      setConfig(prev => ({
        ...prev,
        options: savedOption as OptionsType
      }));
    }
  }, []);

  // Load saved SCW URL
  useEffect(() => {
    if (scwUrl === undefined) {
      const savedScwUrl = localStorage.getItem(SELECTED_SCW_URL_KEY) as ScwUrlType;
      setScwUrl(scwUrls.includes(savedScwUrl) ? savedScwUrl : scwUrls[0]);
    }
  }, [scwUrl]);

  // Initialize SDK and provider
  useEffect(() => {
    let cbwsdk;
    let preference: Preference | string;

    // Configure SDK based on version
    if (version === 'HEAD' || version === latestPkgJson.version) {
      const SDK = CoinbaseWalletSDK;
      cbwsdk = new SDK({
        appName: 'SDK Playground',
        appChainIds: [84532, 8452], // Base, Base Sepolia
      });
      preference = version === 'HEAD'
        ? { options: option, attribution: config.attribution }
        : { options: option };
      setSdk(cbwsdk);
    } else if (version === '3.9.3' || version === '3.7.2') {
      const SDK = CoinbaseWalletSDK;
      cbwsdk = new SDK({
        appName: 'SDK Playground'
      });
      preference = 'jsonRpcUrlMock';
      setSdk(cbwsdk);
    }

    if (!cbwsdk) return;

    // Initialize provider
    const cbwprovider = cbwsdk.makeWeb3Provider();

    // Event handlers
    const handleConnect = (info: { chainId: string }) => {
      console.log('🟢 Connected:', info);
    };

    const handleDisconnect = () => {
      console.log('🔴 Disconnect detected');
      location.reload();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('👤 Accounts changed:', accounts);
    };

    const handleChainChanged = (chainId: string) => {
      console.log('⛓️ Chain changed:', chainId);
    };

    // Add event listeners
    cbwprovider.on('connect', handleConnect);
    cbwprovider.on('accountsChanged', handleAccountsChanged);
    cbwprovider.on('chainChanged', handleChainChanged);
    cbwprovider.on('disconnect', handleDisconnect);

    // Error handling for requests
    const originalRequest = cbwprovider.request.bind(cbwprovider);
    cbwprovider.request = async (...args) => {
      try {
        return await originalRequest(...args);
      } catch (error: any) {
        if (error?.code === 4100) {
          console.log('🔴 4100 error detected, disconnecting');
          handleDisconnect();
        }
        throw error;
      }
    };

    window.ethereum = cbwprovider;
    setProvider(cbwprovider);

    // Cleanup
    return () => {
      cbwprovider.off('connect', handleConnect);
      cbwprovider.off('disconnect', handleDisconnect);
      cbwprovider.off('accountsChanged', handleAccountsChanged);
      cbwprovider.off('chainChanged', handleChainChanged);
    };
  }, [version, option, config]);

  // Handle SCW URL changes
  useEffect(() => {
    if (version === 'HEAD' || version === latestPkgJson.version) {
      if (scwUrl && previousScwUrlRef.current && scwUrl !== previousScwUrlRef.current) {
        provider?.disconnect?.();
      }
      if (scwUrl) {
        previousScwUrlRef.current = scwUrl;
        window.setPopupUrl?.(scwUrl);
      }
    }
  }, [version, scwUrl, provider]);

  // Callback handlers
  const setPreference = useCallback((option: OptionsType) => {
    localStorage.setItem(OPTIONS_KEY, option);
    setOption(option);
  }, []);

  const setSDKVersion = useCallback((version: SDKVersionType) => {
    localStorage.setItem(SELECTED_SDK_KEY, version);
    setVersion(version);
  }, []);

  const setScwUrlAndSave = useCallback((url: ScwUrlType) => {
    localStorage.setItem(SELECTED_SCW_URL_KEY, url);
    setScwUrl(url);
  }, []);

  // Context value
  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      option,
      setPreference,
      sdkVersion: version,
      setSDKVersion,
      scwUrl,
      setScwUrlAndSave,
      config,
      setConfig,
    }),
    [
      sdk,
      provider,
      option,
      setPreference,
      version,
      setSDKVersion,
      scwUrl,
      setScwUrlAndSave,
      config,
      setConfig,
    ]
  );

  return <CBWSDKReactContext.Provider value={ctx}>{children}</CBWSDKReactContext.Provider>;
}

// Custom hook to use the CBWSDK context
export function useCBWSDK() {
  const context = React.useContext(CBWSDKReactContext);
  if (!context) {
    throw new Error('useCBWSDK must be used within a CBWSDKProvider');
  }
  return context;
}