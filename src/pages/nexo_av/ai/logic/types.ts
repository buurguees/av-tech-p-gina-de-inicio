export type ConversationScope = 'user' | 'department';
export type DepartmentScope = 'general' | 'programming' | 'marketing' | 'commercial' | 'administration';
export type MessageSender = 'user' | 'assistant' | 'system';
export type RequestStatus = 'queued' | 'processing' | 'done' | 'error';

export interface Conversation {
  id: string;
  title: string;
  scope: ConversationScope;
  department: DepartmentScope;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  message_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  content: string;
  mode: DepartmentScope;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatRequest {
  id: string;
  conversation_id: string;
  user_id: string;
  mode: DepartmentScope;
  latest_user_message_id: string | null;
  status: RequestStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}
