"use client";

import React, {
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
} from "react";
import Textarea from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import { Connect } from "@/components/wallet/Connect";

// ---------- Types ----------
type Message = {
  role: "user" | "assistant";
  content: string;
};

type Agent = {
  id: number;
  name: string;
  description: string;
  image?: string;
  model?: string;
  type?: string;
  chain?: string;
};

interface FilterState {
  model: string;
  type: string;
  chain: string;
  hasImage: boolean;
}

// ---------- Sample Data & API Routes ----------
const AGENTS: Agent[] = [
  {
    id: 1,
    name: "Venice AI",
    description:
      "Intelligent aggregator focusing on tweets, location data, and summarization.",
    image: "/images/venice.png",
    model: "llama-3.1-405b",
    type: "aggregator",
    chain: "Base",
  },
  {
    id: 2,
    name: "flaunch Agent",
    description:
      "Specializes in technology-related content, research, and debugging solutions.",
    image: "/images/tech.png",
    model: "llama-3.1-405b",
    type: "tech",
    chain: "Base",
  },
  {
    id: 3,
    name: "Moonshot Agent",
    description:
      "Expert in content strategy, marketing insights, and brand voice.",
    image: "/images/flaunch.png",
    model: "llama-3.1-405b",
    type: "marketing",
    chain: "Solana",
  },
  {
    id: 4,
    name: "Crypto Agent",
    description:
      "Specializes in cryptocurrency-related content, research, and debugging solutions.",
    image: "/images/crypto.png",
    model: "llama-3.1-405b",
    type: "crypto",
    chain: "Base",
  },
  {
    id: 5,
    name: " Agent",
    description:
      "Specializes in social media-related content, research, and debugging solutions.",
    image: "/images/social.png",
    model: "llama-3.1-405b",
    type: "social",
    chain: "Base",
  },
  {
    id: 6,
    name: "Research Agent",
    description:
      "Specializes in content, research, and debugging solutions.",
    image: "/images/agent.png",
    model: "llama-3.1-405b",
    type: "research",
    chain: "Base",
  },
];

// Mapping from agent id to the API endpoint route (for chat requests)
const API_ROUTES: Record<number, string> = {
  1: "/api/ai/venice",
  2: "/api/ai/tech",
  3: "/api/ai/flaunch",
  4: "/api/ai/crypto",
  5: "/api/ai/social",
};

// ---------- Components ----------
interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => (
  <div className={`mb-2 ${message.role === "user" ? "text-right" : "text-left"}`}>
    <div
      className={`inline-block p-2 rounded ${
        message.role === "user"
          ? "bg-blue-500 text-white"
          : "bg-gray-700 text-white"
      }`}
    >
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  </div>
);

interface AgentCardProps {
  agent: Agent;
  onStake: (id: number) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onStake }) => (
  <div className="bg-gray-800 p-4 rounded shadow flex flex-col justify-between">
    {agent.image && (
      <img
        src={agent.image}
        alt={`${agent.name} image`}
        className="w-full h-32 object-cover rounded mb-2"
      />
    )}
    <div>
      <h3 className="text-white text-lg font-semibold mb-2">{agent.name}</h3>
      <p className="text-gray-300 text-sm">{agent.description}</p>
      <p className="text-gray-400 text-xs mt-2">
        Model: {agent.model} | Type: {agent.type} | Chain: {agent.chain}
      </p>
    </div>
    <button
      onClick={() => onStake(agent.id)}
      className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors self-start"
    >
      Stake to access this Agent
    </button>
  </div>
);

// ---------- Main Component ----------
const LandingPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  // For chat routing
  const [selectedAgentId, setSelectedAgentId] = useState<number>(AGENTS[0].id);
  // For filtering agent cards
  const [agentFilters, setAgentFilters] = useState<FilterState>({
    model: "",
    type: "",
    chain: "",
    hasImage: false,
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get unique options for each filter category from the agents data
  const models = Array.from(
    new Set(AGENTS.map((a) => a.model).filter(Boolean))
  );
  const types = Array.from(
    new Set(AGENTS.map((a) => a.type).filter(Boolean))
  );
  const chains = Array.from(
    new Set(AGENTS.map((a) => a.chain).filter(Boolean))
  );

  // Filter agents based on the current filter state
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

    // Append user message and clear the input
    const newUserMessage: Message = { role: "user", content: trimmedInput };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setLoading(true);

    // Select the API endpoint based on the selected agent for chat
    const endpoint = API_ROUTES[selectedAgentId] ?? "/api/ai/venice";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

  const handleStake = (agentId: number) => {
    alert(`Staking to agent with ID: ${agentId}`);
    // Implement your staking logic here
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 bg-inherit flex justify-between items-center">
        <h1 className="text-white font-montserrat text-2xl font-semibold">
          Agent Access
        </h1>
        <Connect />
      </header>

      {/* Main Content */}
      <main className="flex-grow flex overflow-hidden">
        {/* Chat Section */}
        <section className="w-1/2 flex flex-col bg-inherit border-r border-gray-700">
          {/* Chat Agent Selection */}
          <div className="p-4 border-b border-gray-700 flex items-center">
            <label htmlFor="agentSelect" className="text-white mr-2">
              Select Agent for Chat:
            </label>
            <select
              id="agentSelect"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(Number(e.target.value))}
              className="bg-gray-800 text-white p-2 rounded"
            >
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chat Messages */}
          <div className="flex-grow overflow-y-auto p-4">
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex">
              <Textarea
                ref={inputRef}
                placeholder="Send a message."
                className="flex-grow text-white min-h-[60px] resize-none bg-inherit px-4 py-2 rounded-l focus:outline-none"
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
        <aside className="w-1/2 flex flex-col bg-inherit p-4 overflow-y-auto">
          <h2 className="text-white font-semibold text-xl mb-4">AI Agents</h2>

          {/* Filter Controls */}
          <div className="mb-4 p-4 bg-gray-800 rounded">
            <div className="flex flex-wrap gap-4">
              {/* Model Filter */}
              <div className="flex flex-col">
                <label htmlFor="filterModel" className="text-white text-sm">
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
                  className="bg-gray-700 text-white p-2 rounded"
                >
                  <option value="">All</option>
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex flex-col">
                <label htmlFor="filterType" className="text-white text-sm">
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
                  className="bg-gray-700 text-white p-2 rounded"
                >
                  <option value="">All</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chain Filter */}
              <div className="flex flex-col">
                <label htmlFor="filterChain" className="text-white text-sm">
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
                  className="bg-gray-700 text-white p-2 rounded"
                >
                  <option value="">All</option>
                  {chains.map((chain) => (
                    <option key={chain} value={chain}>
                      {chain}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Agent Cards */}
          <div className="grid grid-cols-1 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onStake={handleStake} />
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default LandingPage;
