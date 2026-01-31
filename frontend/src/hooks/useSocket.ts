import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket';
import { useAuthStore } from '../store/authStore';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!user || !token) {
      // Disconnect if user logs out
      if (socket) {
        socketService.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect socket with auth token
    const socketInstance = socketService.connect(token);
    setSocket(socketInstance);

    // Listen for connection status changes
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socketInstance.connected);

    // Cleanup on unmount
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
    };
  }, [user, token]);

  return {
    socket,
    isConnected,
    createRoom: socketService.createRoom.bind(socketService),
    joinRoom: socketService.joinRoom.bind(socketService),
    leaveRoom: socketService.leaveRoom.bind(socketService),
    makeMove: socketService.makeMove.bind(socketService),
    sendChatMessage: socketService.sendChatMessage.bind(socketService),
    offerDraw: socketService.offerDraw.bind(socketService),
    respondToDraw: socketService.respondToDraw.bind(socketService),
    resign: socketService.resign.bind(socketService),
  };
};
