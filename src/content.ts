/// <reference lib="dom" />

type HighlightMessage = 
  | { action: 'search'; keywords: string[]; caseSensitive: boolean }
  | { action: 'clear' };

type SearchResult = {
  count: number;
  matches: string[];
};

class ContentHighlighter {
  private readonly highlightClass = 'search-highlight';
  public markers = new Set<HTMLElement>();
  private observer: MutationObserver;
  private currentQuery: { keywords: string[]; caseSensitive: boolean } | null = null;

  constructor() {
    this.observer = new MutationObserver(mutations => this.handleDOMChanges(mutations));
  }

  public getMarkers(): Set<HTMLElement> {
    return this.markers;
  }

  private handleDOMChanges(mutations: MutationRecord[]): void {
    if (this.currentQuery) {
      this.highlightKeywords(this.currentQuery.keywords, this.currentQuery.caseSensitive);
    }
  }

  clearHighlights(): void {
    this.markers.forEach(marker => {
      const parent = marker.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(marker.textContent || ''), marker);
        parent.normalize();
      }
    });
    this.markers.clear();
    this.observer.disconnect();
  }

  highlightKeywords(keywords: string[], caseSensitive: boolean): void {
    if (!keywords.length || keywords.some(k => !k.trim())) {
      console.error('Invalid keywords');
      return;
    }

    this.clearHighlights();
    this.currentQuery = { keywords, caseSensitive };

    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = keywords
        .map(k => this.escapeRegex(k))
        .join('|');
      const regex = new RegExp(`\\b(${pattern})\\b`, flags);

      this.processTextNodes(node => {
        if (!node.textContent || !node.parentNode || this.isInForbiddenElement(node)) return;

        const wrapper = document.createElement('span');
        wrapper.innerHTML = node.textContent.replace(regex, '<mark class="$&">$1</mark>');
        
        const newNodes = Array.from(wrapper.childNodes);
        const markers = wrapper.querySelectorAll<HTMLElement>('mark');
        markers.forEach(marker => this.markers.add(marker));

        (node as ChildNode).replaceWith(...newNodes);
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    } catch (error) {
      console.error('Highlighting failed:', error);
    }
  }

  private processTextNodes(callback: (node: Node) => void): void {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { 
        acceptNode: (node) => 
          node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT 
      }
    );

    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      callback(currentNode);
    }
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private isInForbiddenElement(node: Node): boolean {
    return !!(node.parentNode as Element)?.closest('script, style, noscript, head');
  }
}

const highlighter = new ContentHighlighter();

chrome.runtime.onMessage.addListener((
  message: HighlightMessage,
  _sender,
  sendResponse: (response?: SearchResult) => void
) => {
  try {
    switch (message.action) {
      case 'search':
          highlighter.highlightKeywords(message.keywords, message.caseSensitive);
          sendResponse({
            count: highlighter.markers.size,
            matches: Array.from(highlighter.markers).map(m => m.textContent || '')
          });
          break;
      case 'clear':
        highlighter.clearHighlights();
        sendResponse({ count: 0, matches: [] });
        break;
    }
  } catch (error) {
    console.error('Message handling failed:', error);
    sendResponse({ count: 0, matches: [] });
  }
  return true;
});