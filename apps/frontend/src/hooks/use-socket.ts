'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function useSocket(onEvent: (event: string, data: unknown) => void) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    socket = io(SOCKET_URL, { auth: { token } });

    const handler = (event: string) => (data: unknown) => cbRef.current(event, data);

    const events = [
      'shopping:item-added',
      'shopping:item-purchased',
      'shopping:item-cancelled',
      'shopping:item-updated',
      'shopping:item-deleted',
    ];

    events.forEach((e) => socket?.on(e, handler(e)));

    return () => {
      events.forEach((e) => socket?.off(e));
      socket?.disconnect();
      socket = null;
    };
  }, []);
}
