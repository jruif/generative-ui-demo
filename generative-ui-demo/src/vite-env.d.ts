/// <reference types="vite/client" />

declare global {
  interface Window {
    sendToAgent?: (data: unknown) => void;
  }
}

export {};
