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
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { debounce } from "lodash";

// ---------- Types ----------
type ActionParameter = {
  type: "number" | "string";
  description: string;
  required: boolean;
};

type ActionParameters = {
  amount?: ActionParameter;
  recipient?: ActionParameter;
  [key: string]: ActionParameter | undefined;
};

type Action = {
  name: string;
  parameters: ActionParameters;
};

type Agent = {
  id: number;
  name: string;
  description: string;
  image?: string;
  model?: string;
  type?: string;
  chain?: string;
  agentAddress?: string;
  agentURL?: string;
  stakeNeeded?: boolean;
  actions?: Action[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

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
  10: "/api/ai/saigent",
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

const generateMessageId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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

  const handleCopy = useCallback(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const formattedTimestamp = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString();
  }, [message.timestamp]);

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
                >
                  {showReason ? (
                    <>
                      <ChevronUp size={16} /> Hide Reasoning
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} /> Show Reasoning
                    </>
                  )}
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
      alert("Staking required to access this agent");
      onStake(agent.id);
    } else {
      onSelect(agent.id);
    }
  }, [agent, isUserStaked, onStake, onSelect]);

  const renderActions = () => {
    if (!agent.actions?.length) return null;
    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">
          Available Actions:
        </h4>
        <div className="flex flex-wrap gap-2">
          {agent.actions.map((action, index) => (
            <span
              key={`${action.name}-${index}`}
              className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs"
            >
              {action.name}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`
        bg-white border p-6 rounded-xl shadow-sm transition-all duration-200
        ${selected ? "border-blue-500 shadow-md" : "border-gray-200 hover:shadow-xl"}
        ${agent.stakeNeeded && !isUserStaked ? "opacity-50" : ""}
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
        <p className="text-gray-700 text-sm mb-2">{agent.description}</p>
        <div className="flex flex-wrap gap-2">
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
          {agent.agentAddress && (
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
              {`${agent.agentAddress.slice(0, 6)}...${agent.agentAddress.slice(-4)}`}
            </span>
          )}
        </div>
        {renderActions()}
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
      >
        {agent.stakeNeeded
          ? isUserStaked
            ? "Staked"
            : "Stake to Access"
          : "Access Agent"}
      </button>
    </div>
  );
});

AgentCard.displayName = "AgentCard";

// ---------- Thinking Indicator ----------
const ThinkingIndicator: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="animate-spin mr-2" size={20} />
    <span className="text-gray-600">Thinking...</span>
  </div>
);

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
  const [isSidebarOpen, setIsSidebarOpen] = usePersistentState(
    LOCAL_STORAGE_KEYS.SIDEBAR_STATE,
    true
  );
  const { showToast } = useToast();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // New Chat / Clear Conversation Functionality
  const clearConversation = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  // Improved auto-scroll handling
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (!chatContainerRef.current) return;
    const container = chatContainerRef.current;
    let lastScrollTop = container.scrollTop;
    const handleScroll = () => {
      if (container.scrollTop < lastScrollTop) {
        setShouldAutoScroll(false);
      }
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        setShouldAutoScroll(true);
      }
      lastScrollTop = container.scrollTop;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      const scrollOptions = {
        behavior: "smooth" as const,
        block: "end" as const,
      };
      messagesEndRef.current.scrollIntoView(scrollOptions);
    }
  }, [messages, shouldAutoScroll]);

  const filterOptions = useMemo(
    () => ({
      models: Array.from(new Set(AGENTS.map((a) => a.model).filter(Boolean))),
      types: Array.from(new Set(AGENTS.map((a) => a.type).filter(Boolean))),
      chains: Array.from(new Set(AGENTS.map((a) => a.chain).filter(Boolean))),
    }),
    []
  );

  // In the dropdown we only want to show agents that either do not require staking or that the user is staked.
  const availableAgentsForDropdown = useMemo(() => {
    return AGENTS.filter((agent) => {
      if (agent.stakeNeeded && !isUserStaked) return false;
      return true;
    });
  }, [isUserStaked]);

  // Ensure the selected agent is valid based on the available list.
  useEffect(() => {
    if (
      availableAgentsForDropdown.length > 0 &&
      !availableAgentsForDropdown.some((agent) => agent.id === selectedAgentId)
    ) {
      setSelectedAgentId(availableAgentsForDropdown[0].id);
    }
  }, [availableAgentsForDropdown, selectedAgentId, setSelectedAgentId]);

  const filteredAgents = useMemo(() => {
    return AGENTS.filter((agent) => {
      const { model, type, chain, hasImage } = agentFilters;
      return (
        (!model || agent.model === model) &&
        (!type || agent.type === type) &&
        (!chain || agent.chain === chain) &&
        (!hasImage || agent.image)
      );
    });
  }, [agentFilters]);

  const debouncedHandleChat = useMemo(
    () =>
      debounce(async () => {
        const trimmedInput = inputValue.trim();
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
          const response = await fetch(
            API_ROUTES[selectedAgentId] ?? "/api/ai/venice",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messages: [...messages, newMessage] }),
            }
          );
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
    [messages, selectedAgentId, inputValue]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!loading) debouncedHandleChat();
      }
    },
    [loading, debouncedHandleChat]
  );

  const handleStake = useCallback(
    async (agentId: number) => {
      if (!walletAddress) {
        showToast("Please connect your wallet first", "warning");
        return;
      }
      try {
        const staked = await isStaked(walletAddress);
        setIsUserStaked(staked);
        if (staked) {
          showToast("You are already staked!", "success");
        } else {
          window.open(
            `https://dashboard.mor.org/#/builders/0x3082ff65dbbc9af673b283c31d546436e07875a57eaffa505ce04de42b279306?network=mainnet`,
            "_blank"
          );
        }
      } catch (error) {
        console.error("Error checking stake status:", error);
        showToast("Error checking stake status", "error");
      }
    },
    [walletAddress, showToast]
  );

  const checkStake = useCallback(async () => {
    if (!walletAddress) {
      showToast("Please connect your wallet first", "warning");
      return;
    }
    try {
      const staked = await isStaked(walletAddress);
      setIsUserStaked(staked);
      showToast(
        staked ? "You are currently staked" : "You are not staked yet",
        staked ? "success" : "info"
      );
    } catch (error) {
      console.error("Error checking stake status:", error);
      showToast("Error checking stake status", "error");
    }
  }, [walletAddress, showToast]);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="sticky top-0 z-50 p-4 bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                {sdk ? (
                  <Connect sdk={sdk} onConnect={handleWalletConnection} />
                ) : (
                  <div className="text-gray-600">Loading Base Wallet...</div>
                )}
                <button
                  onClick={checkStake}
                  className={`px-4 py-2 rounded transition-colors ${
                    isUserStaked
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white`}
                >
                  {isUserStaked ? "Staked" : "Check Stake"}
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
            {/* Chat Section */}
            <section
              className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
                isSidebarOpen ? "w-full md:w-1/2" : "w-full"
              }`}
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                      className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300"
                    >
                      {availableAgentsForDropdown.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    {/* New Chat / Clear Conversation Button */}
                    <button
                      onClick={clearConversation}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-900 px-3 py-2 rounded"
                    >
                      New
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={chatContainerRef}
                className="flex-grow overflow-y-auto p-4 space-y-3 scroll-smooth"
              >
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {/* Render the thinking indicator when loading */}
                {loading && <ThinkingIndicator />}
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
                  />
                  <button
                    onClick={() => debouncedHandleChat()}
                    disabled={loading || !inputValue.trim()}
                    className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[60px]"
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
                isSidebarOpen ? "w-full md:w-1/2" : "w-12"
              } ${isSidebarOpen ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
            >
              <button
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="absolute top-4 -left-3 transform bg-white border border-gray-300 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {isSidebarOpen ? (
                  <ChevronRight size={16} />
                ) : (
                  <ChevronLeft size={16} />
                )}
              </button>
              {isSidebarOpen && (
                <div className="h-full overflow-y-auto p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Available Agents
                  </h2>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Filters
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="modelFilter"
                          className="text-sm text-gray-600"
                        >
                          Model
                        </label>
                        <select
                          id="modelFilter"
                          value={agentFilters.model}
                          onChange={(e) =>
                            setAgentFilters((prev) => ({
                              ...prev,
                              model: e.target.value,
                            }))
                          }
                          className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
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
                        <label
                          htmlFor="typeFilter"
                          className="text-sm text-gray-600"
                        >
                          Type
                        </label>
                        <select
                          id="typeFilter"
                          value={agentFilters.type}
                          onChange={(e) =>
                            setAgentFilters((prev) => ({
                              ...prev,
                              type: e.target.value,
                            }))
                          }
                          className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Types</option>
                          {filterOptions.types.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
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
      <div className="mt-12 space-x-8 flex items-center justify-center"> 
        <h1 className="text-gray-900 font-montserrat text-2xl font-bold mb-2 md:mb-0">
          <a href="https://mor.org" target="_blank" rel="noopener noreferrer"> 
            <img src="/images/mor.png" alt="Morpheus" className="w-12 h-6" />
          </a>
        </h1>
          <a
            href="https://discord.gg/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/images/discord.svg"
              alt="Discord"
              className="w-8 h-8"
            />
          </a>
          <a
            href="https://x.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/images/x.svg"
              alt="X"
              className="w-6 h-6"
            />
          </a>
          </div>
    </>
  );
};

export default LandingPage;
