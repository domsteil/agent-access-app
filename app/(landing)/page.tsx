"use client";

import React, { useEffect, useRef, useState, KeyboardEvent } from "react";
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

// ---------- Components ----------

// Chat Message component with light styling
interface ChatMessageProps {
  message: Message;
}
const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => (
  <div className={`mb-2 ${message.role === "user" ? "text-right" : "text-left"}`}>
    <div
      className={`inline-block p-2 rounded ${
        message.role === "user"
          ? "bg-blue-500 text-white"
          : "bg-gray-200 text-gray-900"
      }`}
    >
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  </div>
);

// Agent Card component with light styling
interface AgentCardProps {
  agent: typeof AGENTS[number];
  onStake: (agentId: number) => void;
  isUserStaked: boolean;
}
const AgentCard: React.FC<AgentCardProps> = ({ agent, onStake, isUserStaked }) => (
  <div className="bg-white border border-gray-200 p-4 rounded shadow-sm flex flex-col justify-between">
    <div>
      {agent.image && (
        <img
          src={agent.image}
          alt={`${agent.name} image`}
          className="w-full h-32 object-cover rounded mb-3"
        />
      )}
      <h3 className="text-gray-900 text-lg font-semibold mb-1">{agent.name}</h3>
      <p className="text-gray-700 text-sm">{agent.description}</p>
      <p className="text-gray-500 text-xs mt-1">
        Model: {agent.model} | Type: {agent.type} | Chain: {agent.chain}
      </p>
    </div>
    {agent.stakeNeeded ? (
      isUserStaked ? (
        <div className="mt-4 bg-green-500 text-white px-4 py-2 rounded self-start">
          Staked
        </div>
      ) : (
        <button
          onClick={() => onStake(agent.id)}
          className="mt-4 bg-green-500 hover:bg-green-600 transition-colors text-white px-4 py-2 rounded self-start"
        >
          Stake to access this Agent
        </button>
      )
    ) : (
      <button className="mt-4 bg-blue-500 hover:bg-blue-600 transition-colors text-white px-4 py-2 rounded self-start">
        Access Agent
      </button>
    )}
  </div>
);

// ---------- Main Component ----------
const LandingPage: React.FC = () => {
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
  // Wallet and staking state
  const [walletAddress, setWalletAddress] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("walletAddress") || "";
    }
    return "";
  });
  const [isUserStaked, setIsUserStaked] = useState<boolean>(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sdk, setSDK] = useState<ReturnType<typeof createCoinbaseWalletSDK>>();

  // Initialize Coinbase Wallet SDK and set up account listeners
  useEffect(() => {
    const sdkInstance = createCoinbaseWalletSDK({
      appName: "Agent Access",
      preference: { options: "all" },
    });
    setSDK(sdkInstance);
    if (sdkInstance) {
      const provider = sdkInstance.getProvider();
      provider.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          localStorage.setItem("walletAddress", address);
        } else {
          setWalletAddress("");
          localStorage.removeItem("walletAddress");
        }
      });
      // Check if a wallet is already connected
      (async () => {
        try {
          const accounts = await provider.request({ method: "eth_accounts" });
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

  const handleWalletConnection = (address: string) => {
    setWalletAddress(address);
    localStorage.setItem("walletAddress", address);
  };

  const handleStake = async (agentId: number) => {
    const currentWalletAddress = localStorage.getItem("walletAddress") || walletAddress;
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
        // Implement your staking logic here.
      }
    } catch (error) {
      console.error("Error checking stake status:", error);
      alert("Error checking stake status. Please try again.");
    }
  };

  const checkStake = async () => {
    const currentWalletAddress = localStorage.getItem("walletAddress") || walletAddress;
    if (!currentWalletAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const staked = await isStaked(currentWalletAddress);
      setIsUserStaked(staked);
      alert(staked ? "You are already staked." : "You are not staked yet.");
    } catch (error) {
      console.error("Error fetching staking status:", error);
      alert("Error checking stake status. Please try again.");
    }
  };

  // Auto-scroll to the latest chat message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Derive unique filter options from agents data
  const models = Array.from(new Set(AGENTS.map((a) => a.model).filter(Boolean)));
  const types = Array.from(new Set(AGENTS.map((a) => a.type).filter(Boolean)));
  const chains = Array.from(new Set(AGENTS.map((a) => a.chain).filter(Boolean)));

  // Filter agents based on current filter state
  const filteredAgents = AGENTS.filter((agent) => {
    if (agentFilters.model && agent.model !== agentFilters.model) return false;
    if (agentFilters.type && agent.type !== agentFilters.type) return false;
    if (agentFilters.chain && agent.chain !== agentFilters.chain) return false;
    if (agentFilters.hasImage && !agent.image) return false;
    return true;
  });

  const handleChat = async () => {
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
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
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
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) handleChat();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-gray-900 font-montserrat text-2xl font-semibold">
          Agent Access
        </h1>
        <div className="flex items-center gap-4">
          <Connect sdk={sdk} onConnect={handleWalletConnection} />
          <button
            onClick={checkStake}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Check Stake
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex overflow-hidden">
        {/* Chat Section */}
        <section className="w-1/2 flex flex-col bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center">
            <label htmlFor="agentSelect" className="text-gray-900 mr-2">
              Select Agent for Chat:
            </label>
            <select
              id="agentSelect"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(Number(e.target.value))}
              className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300"
            >
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-grow overflow-y-auto p-4">
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex">
              <Textarea
                ref={inputRef}
                placeholder="Send a message."
                className="flex-grow text-gray-900 min-h-[60px] resize-none bg-gray-100 px-4 py-2 rounded-l border border-gray-300 focus:outline-none"
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
                className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>

        {/* AI Agents Section */}
        <aside className="w-1/2 flex flex-col bg-white p-4 overflow-y-auto">
          <h2 className="text-gray-900 font-semibold text-xl mb-4">AI Agents</h2>

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
                    setAgentFilters((prev) => ({
                      ...prev,
                      model: e.target.value,
                    }))
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
                    setAgentFilters((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
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
                    setAgentFilters((prev) => ({
                      ...prev,
                      chain: e.target.value,
                    }))
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
                    setAgentFilters((prev) => ({
                      ...prev,
                      hasImage: e.target.checked,
                    }))
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
