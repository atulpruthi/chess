import React, { useState, useRef, useEffect } from 'react';
import { useMultiplayerGameStore } from '../store/multiplayerGameStore';

export const MultiplayerChat: React.FC = () => {
  const { chatMessages, sendMessage } = useMultiplayerGameStore();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 shadow-xl flex flex-col h-96">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        💬 Chat
      </h3>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {chatMessages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No messages yet. Say hello!
          </p>
        ) : (
          chatMessages.map((msg, index) => (
            <div key={index} className="bg-slate-700 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-400 font-semibold text-sm">
                  {msg.username}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-gray-200 text-sm">{msg.message}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
};
