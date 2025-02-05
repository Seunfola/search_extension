export type HighlightMessage = 
  | { action: 'search'; keywords: string[]; caseSensitive: boolean }
  | { action: 'clear' };

export type ExtensionMessage = HighlightMessage;

export interface SearchResult {
  count: number;
  matches: string[];
}