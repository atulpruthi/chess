import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useMultiplayerStore } from '../store/multiplayerStore';

export const GameChat = () => {
  const { socket, sendChatMessage } = useSocket();
  const { chatMessages, addChatMessage, currentRoom } = useMultiplayerStore();
  const [message, setMessage] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('chatMessage', (msg: any) => {
      addChatMessage({
        id: `${Date.now()}-${Math.random()}`,
        username: msg.username,
        message: msg.message,
        timestamp: new Date(msg.timestamp),
      });
    });

    return () => {
      socket.off('chatMessage');
    };
  }, [socket, addChatMessage]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentRoom) return;

    sendChatMessage(message.trim());
    setMessage('');
  };

  if (!currentRoom) {
    return (
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Chat</h3>
        <p className="text-white/40 text-center py-8">Join a game to start chatting</p>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6 flex flex-col">
      <h3 className="text-xl font-semibold text-white mb-4">Chat</h3>
      
      {/* Messages */}
      <div ref={messagesContainerRef} className="overflow-y-auto space-y-3 mb-4" style={{ height: '100px' }}>
        {chatMessages.length === 0 ? (
          <p className="text-white/40 text-center py-8">No messages yet</p>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-purple-400">{msg.username}</span>
                <span className="text-white/40 text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-white/80 mt-1">{msg.message}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
};
