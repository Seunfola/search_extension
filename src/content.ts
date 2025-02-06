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

    highlight(keywords: string[]): void {
      this.clear();
      if (!keywords.length) return;

      try {
        const pattern = keywords
          .map(k => k.trim())
          .filter(Boolean)
          .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');

        if (!pattern) return;

        const regex = new RegExp(`(${pattern})`, 'gi');

        document.querySelectorAll('*').forEach(element => {
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD'].includes(element.tagName)) return;
          
          element.childNodes.forEach(node => {
            if (node.nodeType !== Node.TEXT_NODE) return;

            const text = node.textContent || '';
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            for (const match of text.matchAll(regex)) {
              if (match.index === undefined) return;

              // Add preceding text
              if (match.index > lastIndex) {
                fragment.appendChild(
                  document.createTextNode(text.slice(lastIndex, match.index))
                );
              }

              // Add highlight
              const mark = document.createElement('mark');
              mark.className = this.highlightClass;
              mark.textContent = match[0];
              this.markers.push(mark);
              fragment.appendChild(mark);

              lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < text.length) {
              fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }

            node.replaceWith(fragment);
          });
        });

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
  }

  const highlighter = new ContentHighlighter();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message.action === 'search' && message.keywords?.length) {
        highlighter.highlight(message.keywords);
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