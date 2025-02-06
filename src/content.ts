class KeywordHighlighter {
  highlightClass: string;
  highlightedElements: HTMLElement[];

  constructor() {
    this.highlightClass = 'keyword-highlight';
    this.highlightedElements = [];
  }

  clearHighlights(): void {
    this.highlightedElements.forEach((element) => {
      const parent = element.parentNode;
      if (parent) {
        // Replace the marked element with a text node containing its text content
        parent.replaceChild(document.createTextNode(element.textContent || ''), element);
        parent.normalize();
      }
    });
    this.highlightedElements = [];
  }

  /**
   * Highlights every occurrence of the keywords in the document.
   * Returns an array of all matched words.
   */
  highlight(keywords: string[], caseSensitive: boolean): string[] {
    this.clearHighlights();
    if (!keywords.length) return [];

    // Create a regex from the keywords
    const flags = caseSensitive ? 'g' : 'gi';
    const escapedKeywords = keywords.map((word) => this.escapeRegExp(word));
    const regex = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, flags);

    // Array to collect matched words
    const matchedWords: string[] = [];

    this.walkTextNodes((node: Text) => {
      if (
        node.textContent &&
        node.textContent.trim() &&
        !node.parentElement?.closest('script, style')
      ) {
        // Use matchAll to get all matches in the current text node
        const matches = Array.from(node.textContent.matchAll(regex));
        if (matches.length > 0) {
          // Collect each matched word (match[0] is the matched string)
          matches.forEach((match) => {
            if (match[0]) {
              matchedWords.push(match[0]);
            }
          });

          // Create a temporary container element to build the new HTML with highlights
          const span = document.createElement('span');
          // Replace each matched word with a <mark> element having our highlight class
          span.innerHTML = node.textContent.replace(
            regex,
            `<mark class="${this.highlightClass}">$1</mark>`
          );

          // Record all <mark> elements so we can later clear highlights
          const newElements = Array.from(span.childNodes);
          newElements.forEach((child) => {
            if (child instanceof HTMLElement && child.tagName === 'MARK') {
              child.className = this.highlightClass;
              this.highlightedElements.push(child);
            }
          });

          node.replaceWith(...newElements);
        }
      }
    });

    this.scrollToFirstMatch();
    return matchedWords;
  }

  walkTextNodes(callback: (node: Text) => void): void {
    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node: Node) =>
          node.textContent && node.textContent.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      }
    );
    while (treeWalker.nextNode()) {
      callback(treeWalker.currentNode as Text);
    }
  }

  scrollToFirstMatch(): void {
    const firstMatch = document.querySelector(`.${this.highlightClass}`) as HTMLElement | null;
    if (firstMatch) {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

const highlighter = new KeywordHighlighter();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'search') {
    const keywords: string[] = request.keywords
      .split(/,\s*|\s+/)
      .filter((word: string) => word);
    const matchedWords = highlighter.highlight(keywords, request.caseSensitive);
    // Return both the count of highlighted elements and the list of matched words
    sendResponse({ count: highlighter.highlightedElements.length, matchedWords });
  } else if (request.action === 'clear') {
    highlighter.clearHighlights();
    sendResponse({ count: 0, matchedWords: [] });
  }
});
