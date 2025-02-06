/// <reference lib="dom" />

interface Window {
  hasRun?: boolean;
}

(function () {
  if (window.hasRun) return;
  window.hasRun = true;

  class ContentHighlighter {
    private readonly highlightClass = 'search-highlight';
    private markers: HTMLElement[] = [];

    highlight(searchString: string): void {
      this.clear();
      if (!searchString.trim()) return;

      try {
        // Escape regex special characters
        const escapedString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedString})`, 'gi');

        // Process all text nodes in the document
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) =>
              node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
          }
        );

        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent || !node.parentNode || this.isInForbiddenElement(node)) continue;

          const text = node.textContent;
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          let match: RegExpExecArray | null;

          // Reset regex state for each node
          regex.lastIndex = 0;

          while ((match = regex.exec(text)) !== null) {
            // Add preceding text
            if (match.index > lastIndex) {
              fragment.appendChild(
                document.createTextNode(text.slice(lastIndex, match.index))
              );
            }

            // Add highlighted match
            const mark = document.createElement('mark');
            mark.className = this.highlightClass;
            mark.textContent = match[0];
            this.markers.push(mark);
            fragment.appendChild(mark);

            lastIndex = regex.lastIndex;
          }

          // Add remaining text
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
          }

          // Replace original node
          node.parentNode.replaceChild(fragment, node);
        }

      } catch (error) {
        console.error('Highlight error:', error);
      }
    }

    clear(): void {
      this.markers.forEach(marker => {
        const parent = marker.parentNode;
        if (parent) parent.replaceChild(
          document.createTextNode(marker.textContent || ''),
          marker
        );
      });
      this.markers = [];
    }

    private isInForbiddenElement(node: Node): boolean {
      return !!(node.parentNode as Element)?.closest(
        'script, style, noscript, head, textarea, svg, [aria-hidden], .hidden, .sr-only'
      );
    }
  }

  const highlighter = new ContentHighlighter();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message.action === 'search' && message.searchString?.trim()) {
        highlighter.highlight(message.searchString);
        sendResponse({ success: true });
      }
      if (message.action === 'clear') highlighter.clear();
    } catch (error) {
      console.error('Message error:', error);
      sendResponse({ success: false });
    }
    return true;
  });
})();