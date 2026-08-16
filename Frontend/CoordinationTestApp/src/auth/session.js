import { useEffect, useState } from "react";

let currentSession = {
  token: null,
  user: null,
};

const listeners = new Set();

export const getSession = () => currentSession;

export const setSession = (token, user) => {
  currentSession = { token, user };

  global.authToken = token;
  global.loggedUser = user;

  listeners.forEach((listener) => listener({ ...currentSession }));
};

export const clearSession = () => {
  currentSession = {
    token: null,
    user: null,
  };

  global.authToken = null;
  global.loggedUser = null;

  listeners.forEach((listener) => listener({ ...currentSession }));
};

export const useSession = () => {
  const [session, setSessionState] = useState(currentSession);

  useEffect(() => {
    const listener = (nextSession) => {
      setSessionState({ ...nextSession });
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return session;
};