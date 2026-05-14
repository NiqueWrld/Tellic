export type Contact = {
  name: string;
  numbers: string[];
  unsaved?: boolean;
  got_all?: boolean;
};


export type ContactsProgress = {
  phase: 'start' | 'saved' | 'ui-start' | 'ui-scroll' | 'done' | 'error';
  message: string;
  saved?: number;
  unsaved?: number;
  scroll?: number;
  totalScrolls?: number;
};

export type ContactsResult = {
  ok: boolean;
  contacts: Contact[];
  added: number;
  error?: string;
};