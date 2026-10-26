/** Types for the string extractor, which is plain JS so it can run standalone. */
export declare const CONTEXT_KEYS: Record<string, string[]>;
export declare const INDIRECT_UI: string[];
export declare function collectContentStrings(): Promise<Set<string>>;
export declare function collectUiStrings(root?: string): Set<string>;
export declare function collectAll(): Promise<{
  content: Set<string>;
  ui: Set<string>;
  all: Set<string>;
}>;
