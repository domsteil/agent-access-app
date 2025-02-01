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

// ---------- Types ----------
type Message = {
  role: "user" | "assistant";
  content: string;
};

interface FilterState {
  model: string;
  type: string;
  chain: string;
  hasImage: boolean;
}

// ---------- API Routes ----------
const API_ROUTES: Record<number, string> = {
  1: "/api/ai/venice",
  2: "/api/ai/tech",
  3: "/api/ai/flaunch",
  4: "/api/ai/crypto",
  5: "/api/ai/social",
};

// ---------- Custom Hooks ----------

/**
 * useWallet
 *
 * Handles Coinbase Wallet SDK initialization, account changes, and returns the current wallet address.
 */
const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("walletAddress") || "";
    }
    return "";
  });
  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK> | null>(null);

  useEffect(() => {
    const sdkInstance = createCoinbaseWalletSDK({
      appName: "Agent Access",
      preference: { options: "all" },
    });
    setSDK(sdkInstance);
    if (sdkInstance) {
      const provider = sdkInstance.getProvider();
      provider.on("accountsChanged", (accounts: unknown) => {
        // Cast accounts to a string array
        const accountArray = accounts as string[];
        if (accountArray && accountArray.length > 0) {
          const address = accountArray[0];
          setWalletAddress(address);
          localStorage.setItem("walletAddress", address);
        } else {
          setWalletAddress("");
          localStorage.removeItem("walletAddress");
        }
      });
      // Check for an existing connection
      (async () => {
        try {
          const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            localStorage.setItem("walletAddress", accounts[0]);
          }
        } catch (error) {
          console.error("Error checking existing connection:", error);
        }
      })();
    }
  }, []);

  const handleWalletConnection = useCallback((address: string) => {
    setWalletAddress(address);
    localStorage.setItem("walletAddress", address);
  }, []);

  return { walletAddress, sdk, handleWalletConnection };
};

// ---------- Components ----------

// Chat Message component with responsive chat bubbles
interface ChatMessageProps {
  message: Message;
}
const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message }) => (
  <div className={`mb-2 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
    <div
      className={`max-w-[80%] break-words p-3 rounded-lg shadow-sm transition-all duration-200 ${
        message.role === "user"
          ? "bg-blue-600 text-white rounded-br-none hover:shadow-lg"
          : "bg-gray-200 text-gray-900 rounded-bl-none hover:shadow-lg"
      }`}
    >
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  </div>
));

// Agent Card component
interface AgentCardProps {
  agent: typeof AGENTS[number];
  onStake: (agentId: number) => void;
  isUserStaked: boolean;
}
const AgentCard: React.FC<AgentCardProps> = ({ agent, onStake, isUserStaked }) => (
  <div className="bg-white border border-gray-200 p-4 rounded-lg shadow hover:shadow-xl transition-shadow flex flex-col justify-between">
    <div>
      {agent.image && (
        <img
          src={agent.image}
          alt={`${agent.name} image`}
          className="w-full h-32 object-cover rounded mb-3"
        />
      )}
      <h3 className="text-gray-900 text-lg font-bold mb-1">{agent.name}</h3>
      <p className="text-gray-700 text-sm">{agent.description}</p>
      <p className="text-gray-500 text-xs mt-1">
        Model: {agent.model} | Type: {agent.type} | Chain: {agent.chain}
      </p>
    </div>
    {agent.stakeNeeded ? (
      isUserStaked ? (
        <div className="mt-4 bg-green-500 text-white px-3 py-2 rounded">
          Staked
        </div>
      ) : (
        <button
          onClick={() => onStake(agent.id)}
          className="mt-4 bg-green-500 hover:bg-green-600 transition-colors text-white px-3 py-2 rounded"
        >
          Stake to access this Agent
        </button>
      )
    ) : (
      <button className="mt-4 bg-blue-500 hover:bg-blue-600 transition-colors text-white px-3 py-2 rounded">
        Access Agent
      </button>
    )}
  </div>
);

// ---------- Main Component ----------
const LandingPage: React.FC = () => {
  const { walletAddress, sdk, handleWalletConnection } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number>(AGENTS[0].id);
  const [agentFilters, setAgentFilters] = useState<FilterState>({
    model: "",
    type: "",
    chain: "",
    hasImage: false,
  });
  const [isUserStaked, setIsUserStaked] = useState<boolean>(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest chat message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Memoized filter options
  const models = useMemo(
    () => Array.from(new Set(AGENTS.map((a) => a.model).filter(Boolean))),
    []
  );
  const types = useMemo(
    () => Array.from(new Set(AGENTS.map((a) => a.type).filter(Boolean))),
    []
  );
  const chains = useMemo(
    () => Array.from(new Set(AGENTS.map((a) => a.chain).filter(Boolean))),
    []
  );

  // Filter agents based on filter state
  const filteredAgents = useMemo(() => {
    return AGENTS.filter((agent) => {
      if (agentFilters.model && agent.model !== agentFilters.model) return false;
      if (agentFilters.type && agent.type !== agentFilters.type) return false;
      if (agentFilters.chain && agent.chain !== agentFilters.chain) return false;
      if (agentFilters.hasImage && !agent.image) return false;
      return true;
    });
  }, [agentFilters]);

  // Handle chat submission
  const handleChat = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;
    const newUserMessage: Message = { role: "user", content: trimmedInput };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setLoading(true);

    const endpoint = API_ROUTES[selectedAgentId] ?? "/api/ai/venice";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const assistantMessageContent = data?.choices?.[0]?.message?.content;
      if (assistantMessageContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantMessageContent },
        ]);
      } else {
        throw new Error("No message content returned");
      }
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, messages, selectedAgentId]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) handleChat();
    }
  }, [loading, handleChat]);

  // Handle staking for an agent that requires staking
  const handleStake = useCallback(async (agentId: number) => {
    const currentWalletAddress =
      walletAddress || localStorage.getItem("walletAddress") || "";
    if (!currentWalletAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const staked = await isStaked(currentWalletAddress);
      setIsUserStaked(staked);
      if (staked) {
        alert("You are already staked to this agent.");
      } else {
        alert(`Staking to agent with ID: ${agentId}`);
        // Insert your staking logic here
      }
    } catch (error) {
      console.error("Error checking stake status:", error);
      alert("Error checking stake status. Please try again.");
    }
  }, [walletAddress]);

  // Check stake status (via header button)
  const checkStake = useCallback(async () => {
    const currentWalletAddress =
      walletAddress || localStorage.getItem("walletAddress") || "";
    if (!currentWalletAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const staked = await isStaked(currentWalletAddress);
      setIsUserStaked(staked);
      alert(staked ? "You are already staked." : "You are not staked yet.");
    } catch (error) {
      console.error("Error checking stake status:", error);
      alert("Error checking stake status. Please try again.");
    }
  }, [walletAddress]);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="p-4 bg-white border-b border-gray-200 flex flex-col md:flex-row items-center justify-between">
        <h1 className="text-gray-900 font-montserrat text-2xl font-bold mb-2 md:mb-0">
          Agent Access
        </h1>
        <div className="flex items-center gap-4">
          {sdk && <Connect sdk={sdk} onConnect={handleWalletConnection} />}
          <button
            onClick={checkStake}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Check Stake
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Chat Section */}
        <section className="w-full md:w-1/2 flex flex-col bg-white border-b md:border-b-0 md:border-r border-gray-200">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between">
            <label htmlFor="agentSelect" className="text-gray-900 mr-2 whitespace-nowrap">
              Select Agent for Chat:
            </label>
            <select
              id="agentSelect"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(Number(e.target.value))}
              className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300 w-full sm:w-auto"
            >
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Improved Send Box */}
          <div className="sticky bottom-0 z-10 p-4 border-t border-gray-200 bg-gray-50 shadow-inner">
            <div className="flex">
              <Textarea
                ref={inputRef}
                placeholder="Type your message here..."
                className="flex-grow text-gray-900 min-h-[60px] resize-none bg-white px-4 py-3 rounded-l border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onClick={handleChat}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-r hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>

        {/* AI Agents Section */}
        <aside className="w-full md:w-1/2 flex flex-col bg-white p-4 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-200">
          <h2 className="text-gray-900 font-bold text-xl mb-4">AI Agents</h2>

          <div className="mb-4 p-4 bg-gray-100 border border-gray-200 rounded">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col">
                <label htmlFor="filterModel" className="text-gray-900 text-sm">
                  Model
                </label>
                <select
                  id="filterModel"
                  value={agentFilters.model}
                  onChange={(e) =>
                    setAgentFilters((prev) => ({ ...prev, model: e.target.value }))
                  }
                  className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300"
                >
                  <option value="">All</option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="filterType" className="text-gray-900 text-sm">
                  Type
                </label>
                <select
                  id="filterType"
                  value={agentFilters.type}
                  onChange={(e) =>
                    setAgentFilters((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300"
                >
                  <option value="">All</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="filterChain" className="text-gray-900 text-sm">
                  Chain
                </label>
                <select
                  id="filterChain"
                  value={agentFilters.chain}
                  onChange={(e) =>
                    setAgentFilters((prev) => ({ ...prev, chain: e.target.value }))
                  }
                  className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300"
                >
                  <option value="">All</option>
                  {chains.map((chain) => (
                    <option key={chain} value={chain}>
                      {chain}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <label htmlFor="filterImage" className="text-gray-900 text-sm mr-2">
                  Has Image
                </label>
                <input
                  id="filterImage"
                  type="checkbox"
                  checked={agentFilters.hasImage}
                  onChange={(e) =>
                    setAgentFilters((prev) => ({ ...prev, hasImage: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onStake={handleStake}
                isUserStaked={isUserStaked}
              />
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default LandingPage;
