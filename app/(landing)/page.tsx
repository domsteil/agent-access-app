"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Textarea from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import { Connect } from '@/components/wallet/ConnectWallet';

const LandingPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Example agents data
  const agents = [
    {
      id: 1,
      name: "Venice AI",
      description: "Intelligent aggregator focusing on tweets, location data, and summarization.",
    },
    {
      id: 2,
      name: "Tech GPT",
      description: "Specializes in technology-related content, research, and debugging solutions.",
    },
    {
      id: 3,
      name: "Marketing Wizard",
      description: "Expert in content strategy, marketing insights, and brand voice.",
    }
  ];

  const handleChat = async () => {
    if (!inputValue.trim()) return;

    const newMessages = [...messages, { role: "user", content: inputValue }];
    setMessages(newMessages);
    setInputValue('');

    try {
      const res = await fetch("/api/ai/venice-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: data.choices[0].message.content }
      ]);

      // If you have map updates or other data, handle them here:
      // if (data.twitterData && data.twitterData.locations) {
      //   updateMapLocations(data.twitterData.locations);
      // }
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: "Sorry, there was an error processing your request." }
      ]);
    }
  };

  const handleStake = (agentId: number) => {
    alert(`Staking to agent with ID: ${agentId}`);
    // Add your staking logic here
  };

  return (
    <div className="h-screen flex flex-col">
      <h1 className="text-white font-montserrat text-2xl font-semibold p-4 bg-inherit">
        Agent Access
      </h1>
      {/* Connect Wallet Button */}
      <Connect />
      <div className="flex-grow flex">
        {/* Left side: Chat UI */}
        <div className="w-1/2 flex flex-col bg-inherit">
          <div className="flex-grow overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-2 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-2 rounded ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4">
            <div className="flex">
              <Textarea
                ref={inputRef}
                tabIndex={0}
                placeholder="Send a message."
                className="flex-grow text-white min-h-[60px] resize-none bg-inherit px-4 py-2 rounded-l focus-within:outline-none"
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                name="message"
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChat();
                  }
                }}
              />
              <button
                onClick={handleChat}
                className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right side: AI Agent cards */}
        <div className="w-1/2 flex flex-col bg-inherit p-4">
          <h2 className="text-white font-semibold text-xl mb-4">AI Agents</h2>
          <div className="grid grid-cols-1 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-800 p-4 rounded shadow flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-white text-lg font-semibold mb-2">
                    {agent.name}
                  </h3>
                  <p className="text-gray-300 text-sm">{agent.description}</p>
                </div>
                <button
                  onClick={() => handleStake(agent.id)}
                  className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors self-start"
                >
                  Stake to this Agent
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
