import { useEffect, useRef, useState } from 'react';
import WebSocketClient from '../services/WebSocketClient';

/**
 * Custom hook for WebSocket functionality
 * Provides real-time communication capabilities to React components
 */
export const useWebSocket = (url = 'ws://localhost:3001') => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const wsClient = useRef(null);

    useEffect(() => {
        // Initialize WebSocket client
        wsClient.current = new WebSocketClient(url);

        // Set up event listeners
        wsClient.current.on('connected', () => {
            setIsConnected(true);
            setConnectionError(null);
        });

        wsClient.current.on('disconnected', () => {
            setIsConnected(false);
        });

        wsClient.current.on('error', (error) => {
            setConnectionError(error);
        });

        wsClient.current.on('message', (message) => {
            setLastMessage(message);
        });

        wsClient.current.on('reconnectFailed', () => {
            setConnectionError('Failed to reconnect to server');
        });

        // Cleanup on unmount
        return () => {
            if (wsClient.current) {
                wsClient.current.disconnect();
            }
        };
    }, [url]);

    const sendMessage = (message) => {
        if (wsClient.current) {
            wsClient.current.send(message);
        }
    };

    const sendNoteUpdate = (noteData) => {
        if (wsClient.current) {
            wsClient.current.sendNoteUpdate(noteData);
        }
    };

    const sendNoteDelete = (noteId) => {
        if (wsClient.current) {
            wsClient.current.sendNoteDelete(noteId);
        }
    };

    const ping = () => {
        if (wsClient.current) {
            wsClient.current.ping();
        }
    };

    const addEventListener = (event, callback) => {
        if (wsClient.current) {
            wsClient.current.on(event, callback);
        }
    };

    const removeEventListener = (event, callback) => {
        if (wsClient.current) {
            wsClient.current.off(event, callback);
        }
    };

    const getStatus = () => {
        return wsClient.current ? wsClient.current.getStatus() : null;
    };

    return {
        isConnected,
        lastMessage,
        connectionError,
        sendMessage,
        sendNoteUpdate,
        sendNoteDelete,
        ping,
        addEventListener,
        removeEventListener,
        getStatus
    };
};

export default useWebSocket;
