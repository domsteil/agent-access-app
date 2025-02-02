"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  KeyboardEvent,
} from "react";
import Textarea from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import { Connect } from "@/components/wallet/Connect";
import { isStaked } from "@/utils/check_stake";
import { createCoinbaseWalletSDK } from "@coinbase/wallet-sdk";
import { AGENTS } from "@/agents";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Send,
  Check,
} from "lucide-react";
import { debounce } from "lodash";

// ---------- Types ----------
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type Agent = typeof AGENTS[number];

interface FilterState {
  model: string;
  type: string;
  chain: string;
  hasImage: boolean;
}

// ---------- Constants ----------
const API_ROUTES: Record<number, string> = {
  1: "/api/ai/venice",
  2: "/api/ai/tech",
  3: "/api/ai/flaunch",
  4: "/api/ai/crypto",
  5: "/api/ai/social",
};

const LOCAL_STORAGE_KEYS = {
  WALLET_ADDRESS: "walletAddress",
  SELECTED_AGENT: "selectedAgent",
  CHAT_MESSAGES: "chatMessages",
  SIDEBAR_STATE: "sidebarState",
} as const;

// ---------- Helper Functions ----------
const splitMessage = (body: string) => {
  const thinkEndIndex = body.indexOf("</think>");
  if (thinkEndIndex !== -1) {
    return {
      reason: body.substring(0, thinkEndIndex).trim(),
      response: body.substring(thinkEndIndex + 8).trim(),
    };
  }

  const transitionPhrases = [
    "Putting it all together,",
    "Finally,",
    "In conclusion,",
    "To summarize,",
    "In summary,",
  ];

  for (const phrase of transitionPhrases) {
    const idx = body.indexOf(phrase);
    if (idx !== -1) {
      const periodIdx = body.indexOf(".", idx);
      if (periodIdx !== -1) {
        return {
          reason: body.substring(0, idx).trim(),
          response: body.substring(periodIdx + 1).trim(),
        };
      }
    }
  }

  return { reason: "", response: body };
};

const generateMessageId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ---------- Custom Hooks ----------

/**
 * Manages wallet connection state and initializes the Coinbase Wallet SDK.
 */
const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.WALLET_ADDRESS) || "";
    }
    return "";
  });
  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK> | null>(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        const sdkInstance = createCoinbaseWalletSDK({
          appName: "Agent Access",
          preference: { options: "all" },
        });
        setSDK(sdkInstance);

        if (sdkInstance) {
          const provider = sdkInstance.getProvider();
          provider.on("accountsChanged", (accounts: unknown) => {
            const accountArray = accounts as string[];
            if (accountArray?.[0]) {
              setWalletAddress(accountArray[0]);
              localStorage.setItem(LOCAL_STORAGE_KEYS.WALLET_ADDRESS, accountArray[0]);
            } else {
              setWalletAddress("");
              localStorage.removeItem(LOCAL_STORAGE_KEYS.WALLET_ADDRESS);
            }
          });

          const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
          if (accounts?.[0]) {
            setWalletAddress(accounts[0]);
            localStorage.setItem(LOCAL_STORAGE_KEYS.WALLET_ADDRESS, accounts[0]);
          }
        }
      } catch (error) {
        console.error("Error initializing wallet SDK:", error);
      }
    };

    initializeSDK();
  }, []);

  const handleWalletConnection = useCallback((address: string) => {
    setWalletAddress(address);
    localStorage.setItem(LOCAL_STORAGE_KEYS.WALLET_ADDRESS, address);
  }, []);

  return { walletAddress, sdk, handleWalletConnection };
};

/**
 * A hook that persists state to localStorage.
 */
const usePersistentState = <T,>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const savedValue = localStorage.getItem(key);
      return savedValue ? JSON.parse(savedValue) : initialValue;
    }
    return initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
};

// ---------- Components ----------

const ChatMessage: React.FC<{ message: Message }> = React.memo(({ message }) => {
  const isAssistant = message.role === "assistant";
  const hasThinkBlock = isAssistant && message.content.includes("<think>");
  const { reason, response } = hasThinkBlock
    ? splitMessage(message.content)
    : { reason: "", response: message.content };
  const [showReason, setShowReason] = useState(false);
  const [copied, setCopied] = useState(false);

  // Display the message timestamp
  const formattedTimestamp = useMemo(
    () => new Date(message.timestamp).toLocaleTimeString(),
    [message.timestamp]
  );

  const handleCopy = useCallback(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div
      className={`mb-3 flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <CopyToClipboard text={message.content} onCopy={handleCopy}>
        <div className="relative w-full max-w-[80%] group">
          <div
            className={`p-4 rounded-xl shadow-md transition-all duration-200 ${
              message.role === "user"
                ? "bg-blue-600 text-white hover:shadow-lg"
                : "bg-gray-100 text-gray-800 hover:shadow-lg"
            }`}
          >
            <div className="text-xs text-gray-500 mb-2">{formattedTimestamp}</div>
            <ReactMarkdown className="prose max-w-none">{response}</ReactMarkdown>
            {hasThinkBlock && reason && (
              <div className="mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReason((prev) => !prev);
                  }}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  aria-label={showReason ? "Hide Reasoning" : "Show Reasoning"}
                >
                  {showReason ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showReason ? "Hide Reasoning" : "Show Reasoning"}
                </button>
                {showReason && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    <ReactMarkdown className="prose max-w-none">{reason}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
          {copied && (
            <div className="absolute top-2 right-2 text-xs text-green-500 flex items-center gap-1">
              <Check size={12} /> Copied
            </div>
          )}
        </div>
      </CopyToClipboard>
    </div>
  );
});

ChatMessage.displayName = "ChatMessage";

const AgentCard: React.FC<{
  agent: Agent;
  onStake: (agentId: number) => void;
  isUserStaked: boolean;
  selected: boolean;
  onSelect: (id: number) => void;
}> = React.memo(({ agent, onStake, isUserStaked, selected, onSelect }) => {
  const handleClick = useCallback(() => {
    if (agent.stakeNeeded && !isUserStaked) {
      onStake(agent.id);
    } else {
      onSelect(agent.id);
    }
  }, [agent, isUserStaked, onStake, onSelect]);

  return (
    <div
      className={`
        bg-white border p-6 rounded-xl shadow-sm transition-all duration-200
        ${selected ? "border-blue-500 shadow-md" : "border-gray-200 hover:shadow-xl"}
      `}
    >
      <div className="relative">
        {agent.image && (
          <img
            src={agent.image}
            alt={`${agent.name} image`}
            className="w-full h-32 object-cover rounded-lg mb-4"
            loading="lazy"
          />
        )}
        <h3 className="text-gray-900 text-xl font-bold mb-1">{agent.name}</h3>
        <p className="text-gray-700 text-sm">{agent.description}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {agent.model && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {agent.model}
            </span>
          )}
          {agent.type && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              {agent.type}
            </span>
          )}
          {agent.chain && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
              {agent.chain}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleClick}
        className={`
          mt-4 w-full px-4 py-2 rounded transition-colors
          ${
            agent.stakeNeeded && !isUserStaked
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }
        `}
        aria-label={agent.stakeNeeded && !isUserStaked ? "Stake to Access" : "Access Agent"}
      >
        {agent.stakeNeeded ? (isUserStaked ? "Staked" : "Stake to Access") : "Access Agent"}
      </button>
    </div>
  );
});

AgentCard.displayName = "AgentCard";

// ---------- Main Component ----------

const LandingPage: React.FC = () => {
  const { walletAddress, sdk, handleWalletConnection } = useWallet();
  const [messages, setMessages] = usePersistentState<Message[]>(
    LOCAL_STORAGE_KEYS.CHAT_MESSAGES,
    []
  );
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = usePersistentState<number>(
    LOCAL_STORAGE_KEYS.SELECTED_AGENT,
    AGENTS[0].id
  );
  const [agentFilters, setAgentFilters] = useState<FilterState>({
    model: "",
    type: "",
    chain: "",
    hasImage: false,
  });
  const [isUserStaked, setIsUserStaked] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.SIDEBAR_STATE,
    true
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll: using an IntersectionObserver to ensure the latest message is in view.
  useEffect(() => {
    if (!messagesEndRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[entries.length - 1];
        if (!lastEntry?.isIntersecting) {
          lastEntry?.target.scrollIntoView({ behavior: "smooth" });
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(messagesEndRef.current);
    return () => observer.disconnect();
  }, [messages]);

  // Memoized filter options (ensuring type safety)
  const filterOptions = useMemo(
    () => ({
      models: Array.from(new Set(AGENTS.map((a) => a.model).filter(Boolean))),
      types: Array.from(new Set(AGENTS.map((a) => a.type).filter(Boolean))),
      chains: Array.from(new Set(AGENTS.map((a) => a.chain).filter(Boolean))),
    }),
    []
  );

  // Filter agents based on current filter settings
  const filteredAgents = useMemo(() => {
    return AGENTS.filter((agent) => {
      const { model, type, chain, hasImage } = agentFilters;
      return (!model || agent.model === model) &&
             (!type || agent.type === type) &&
             (!chain || agent.chain === chain) &&
             (!hasImage || agent.image);
    });
  }, [agentFilters]);

  // Debounced chat handler accepts the latest text as a parameter.
  const debouncedHandleChat = useMemo(
    () =>
      debounce(async (text: string) => {
        const trimmedInput = text.trim();
        if (!trimmedInput) return;

        const newMessage: Message = {
          id: generateMessageId(),
          role: "user",
          content: trimmedInput,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputValue("");
        setLoading(true);

        try {
          const response = await fetch(API_ROUTES[selectedAgentId] ?? "/api/ai/venice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [...messages, newMessage] }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const assistantMessageContent = data?.choices?.[0]?.message?.content;

          if (assistantMessageContent) {
            const assistantMessage: Message = {
              id: generateMessageId(),
              role: "assistant",
              content: assistantMessageContent,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          } else {
            throw new Error("No message content returned");
          }
        } catch (error) {
          console.error("Error in chat:", error);
          setMessages((prev) => [
            ...prev,
            {
              id: generateMessageId(),
              role: "assistant",
              content:
                "Sorry, there was an error processing your request. Please try again.",
              timestamp: Date.now(),
            },
          ]);
        } finally {
          setLoading(false);
          inputRef.current?.focus();
        }
      }, 300),
    [messages, selectedAgentId]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedHandleChat.cancel();
    };
  }, [debouncedHandleChat]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!loading) debouncedHandleChat(inputValue);
      }
    },
    [loading, inputValue, debouncedHandleChat]
  );

  // Stake handling with error management
  const handleStake = useCallback(
    async (agentId: number) => {
      const currentWalletAddress =
        walletAddress ||
        localStorage.getItem(LOCAL_STORAGE_KEYS.WALLET_ADDRESS);

      if (!currentWalletAddress) {
        alert("Please connect your wallet first.");
        return;
      }

      try {
        const staked = await isStaked(currentWalletAddress);
        setIsUserStaked(staked);

        if (staked) {
          alert("You are already staked!");
        } else {
          window.open(
            `https://dashboard.mor.org/#/builders/${currentWalletAddress}?network=base`,
            "_blank"
          );
        }
      } catch (error) {
        console.error("Error checking stake status:", error);
      }
    },
    [walletAddress]
  );

  // Enhanced stake status check
  const checkStake = useCallback(async () => {
    const currentWalletAddress =
      walletAddress ||
      localStorage.getItem(LOCAL_STORAGE_KEYS.WALLET_ADDRESS);

    if (!currentWalletAddress) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const staked = await isStaked(currentWalletAddress);
      setIsUserStaked(staked);
      alert(staked ? "You are currently staked" : "You are not staked yet");
    } catch (error) {
      console.error("Error checking stake status:", error);
    }
  }, [walletAddress]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-50 p-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
            <h1 className="text-gray-900 font-montserrat text-2xl font-bold mb-2 md:mb-0">
              Agent Access
            </h1>
            <div className="flex items-center gap-4">
              {sdk ? (
                <Connect sdk={sdk} onConnect={handleWalletConnection} />
              ) : (
                <div className="text-gray-600">Loading Wallet...</div>
              )}
              <button
                onClick={checkStake}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Check Stake
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
          {/* Chat Section */}
          <section className="w-full md:w-1/2 flex flex-col bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Chat with Agent</h2>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                  className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300"
                  aria-label="Select chat agent"
                >
                  {AGENTS.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-grow overflow-y-auto p-4 space-y-3 scroll-smooth"
            >
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <div className="sticky bottom-0 z-10 p-4 border-t border-gray-200 bg-white shadow-lg">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={inputRef}
                  placeholder="Type your message here... (Shift + Enter for new line)"
                  className="flex-grow text-gray-900 min-h-[60px] max-h-[200px] resize-none bg-gray-50 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  spellCheck
                  aria-label="Chat input"
                />
                <button
                  onClick={() => debouncedHandleChat(inputValue)}
                  disabled={loading || !inputValue.trim()}
                  className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[60px]"
                  aria-label="Send message"
                >
                  <Send size={20} />
                  {loading ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </section>

          {/* AI Agents Sidebar */}
          <aside
            className={`relative transition-all duration-300 overflow-hidden border-l border-gray-200 bg-white ${
              isSidebarOpen ? "w-full md:w-1/2" : "w-8"
            }`}
          >
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="absolute top-4 -left-3 transform bg-white border border-gray-300 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {isSidebarOpen && (
              <div className="h-full overflow-y-auto p-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Available Agents</h2>

                {/* Filters */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="modelFilter" className="text-sm text-gray-600">
                        Model
                      </label>
                      <select
                        id="modelFilter"
                        value={agentFilters.model}
                        onChange={(e) =>
                          setAgentFilters((prev) => ({ ...prev, model: e.target.value }))
                        }
                        className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
                        aria-label="Filter by model"
                      >
                        <option value="">All Models</option>
                        {filterOptions.models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="typeFilter" className="text-sm text-gray-600">
                        Type
                      </label>
                      <select
                        id="typeFilter"
                        value={agentFilters.type}
                        onChange={(e) =>
                          setAgentFilters((prev) => ({ ...prev, type: e.target.value }))
                        }
                        className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
                        aria-label="Filter by type"
                      >
                        <option value="">All Types</option>
                        {filterOptions.types.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="chainFilter" className="text-sm text-gray-600">
                        Chain
                      </label>
                      <select
                        id="chainFilter"
                        value={agentFilters.chain}
                        onChange={(e) =>
                          setAgentFilters((prev) => ({ ...prev, chain: e.target.value }))
                        }
                        className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
                        aria-label="Filter by chain"
                      >
                        <option value="">All Chains</option>
                        {filterOptions.chains.map((chain) => (
                          <option key={chain} value={chain}>
                            {chain}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="imageFilter"
                        checked={agentFilters.hasImage}
                        onChange={(e) =>
                          setAgentFilters((prev) => ({ ...prev, hasImage: e.target.checked }))
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        aria-label="Filter agents that have an image"
                      />
                      <label htmlFor="imageFilter" className="text-sm text-gray-600">
                        Has Image
                      </label>
                    </div>
                  </div>
                </div>

                {/* Agent Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {filteredAgents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No agents match your filters
                    </div>
                  ) : (
                    filteredAgents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        onStake={handleStake}
                        isUserStaked={isUserStaked}
                        selected={agent.id === selectedAgentId}
                        onSelect={setSelectedAgentId}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
