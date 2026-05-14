import type { Contact } from './Contact';

export type Message = {
  date: string;
  time: string;
  sender: string;
  text: string;
};

export type MessagesProgress = {
  phase:
    | 'start'
    | 'contact-start'
    | 'contact-skip'
    | 'contact-open'
    | 'contact-export'
    | 'contact-parse'
    | 'contact-done'
    | 'file-parse'
    | 'done'
    | 'error';
  message: string;
  index?: number;
  total?: number;
  name?: string;
  parsed?: number;
  added?: number;
};

export type MessagesResult = {
  ok: boolean;
  exported: number;
  skipped: number;
  added: number;
  contacts: Contact[];
  error?: string;
};

// App-schema database persisted to messages.json.
export type SchemaDb = {
  bookings: Record<string, unknown>;
  businesses: Record<string, unknown>;
  clients: Record<
    string,
    {
      phoneNumber: string;
      fullName: string;
      createdAt: string;
      updatedAt: string;
    }
  >;
  conversations: Record<
    string,
    {
      businessId: string;
      receptionistId: string;
      phoneNumber: string;
      contactName: string;
      clientId: string;
      createdAt: string;
      updatedAt: string;
      lastMessageAt?: string;
      lastMessage?: string;
    }
  >;
  errorLogs: Record<string, unknown>;
  feedback: Record<string, unknown>;
  messages: Record<
    string,
    {
      conversationId: string;
      businessId: string;
      receptionistId: string;
      clientId: string;
      direction: 'inbound' | 'outbound';
      content: string;
      timestamp: string;
    }
  >;
  receptionists: Record<string, unknown>;
  subscriptions: Record<string, unknown>;
};
