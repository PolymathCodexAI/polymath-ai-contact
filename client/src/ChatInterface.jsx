import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

const FormattedText = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
};

const ChatInterface = () => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const listRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const scrollToBottom = () => {
        if (listRef.current) {
            listRef.current.scrollTo({
                top: listRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initial message
    useEffect(() => {
        const startChat = async () => {
            setIsProcessing(true);
            try {
                const response = await fetch(`${API_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "init" }), // Trigger greeting
                });
                const data = await response.json();
                setSessionId(data.sessionId);
                setMessages([{ id: Date.now(), text: data.response, sender: 'ai' }]);
            } catch (error) {
                console.error('Error:', error);
                setMessages([{ id: Date.now(), text: "Error connecting to server. Please ensure the backend is running.", sender: 'system' }]);
            }
            setIsProcessing(false);
        };
        startChat();
    }, []);

    const handleSendMessage = async (text) => {
        if (!text.trim() || isProcessing) return;

        const userMessage = { id: Date.now(), text: text, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsProcessing(true);

        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, sessionId }),
            });
            const data = await response.json();
            setMessages(prev => [...prev, { id: Date.now() + 1, text: data.response, sender: 'ai' }]);

            if (data.isEscalation) {
                setMessages(prev => [...prev, { id: Date.now() + 2, text: "💡 [System] Our team has been notified for high-priority follow-up.", sender: 'system' }]);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Connection error. Please check your internet.", sender: 'ai' }]);
        }
        setIsProcessing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(inputText);
        }
    };

    return (
        <div className="phone-container">
            <div className="phone-header">
                <div className="notch"></div>
                <div className="header-content">
                    <h1>PolyMath AI Contact</h1>
                    <span className="status-dot"></span>
                </div>
            </div>

            <div className="messages-list" ref={listRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-row ${msg.sender}`}>
                        <div className="message-bubble">
                            <FormattedText text={msg.text} />
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="message-row ai">
                        <div className="message-bubble typing">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                    </div>
                )}
            </div>

            <div className="input-bar">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Speak to AI..."
                    rows="1"
                />
                <button onClick={() => handleSendMessage(inputText)} disabled={isProcessing || !inputText.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ChatInterface;
