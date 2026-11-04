import { Action, ParseResult } from '../../schemas/actions.js';

export interface LLMInput {
  transcript: string;
  lang: 'hi-IN' | 'en-IN';
  nowIso: string; // Asia/Kolkata
  customers: string[]; // top 30 first names only
  history: string[]; // last 3 transcripts
  pendingQuestion?: string; // set during a clarification turn
  pendingAction?: any; // the action that was waiting for clarification
}

export interface LLMProvider {
  name: 'gemini' | 'claude';
  parse(input: LLMInput): Promise<ParseResult>;
}

