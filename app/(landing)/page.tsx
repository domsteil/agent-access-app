"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Textarea from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';

const LandingPage = () => {

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const popup = useRef(null);
    const activePopup = useRef(null);

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
            setMessages(prevMessages => [
                ...prevMessages,
                { role: "assistant", content: data.choices[0].message.content }
            ]);

            // Update map with new tweet locations
            if (data.twitterData && data.twitterData.locations) {
                updateMapLocations(data.twitterData.locations);
            }
        } catch (error) {
            console.error("Error in chat:", error);
            setMessages(prevMessages => [
                ...prevMessages,
                { role: "assistant", content: "Sorry, there was an error processing your request." }
            ]);
        }
    };

    return (
        <div className="h-screen flex flex-col">
            <h1 className="text-white font-montserrat text-2xl font-semibold p-4 bg-inherit">Agent Access</h1>
            <div className="flex-grow flex">
                <div className="w-1/2 flex flex-col bg-inherit">
                    <div className="flex-grow overflow-y-auto p-4">
                        {messages.map((message, index) => (
                            <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block p-2 rounded ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}>
                                <ReactMarkdown>
                                    {message.content}
                                </ReactMarkdown>
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
                                onChange={e => setInputValue(e.target.value)}
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
            </div>
        </div>
    );
}

export default LandingPage;