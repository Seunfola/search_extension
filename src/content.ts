let currentHighlights: HTMLElement[] = [];

function clearHighlights() {
  currentHighlights.forEach(el => {
    const parent = el.parentNode;
    if (!parent) return;

    parent.replaceChild(document.createTextNode(el.textContent || ''), el);
    parent.normalize(); // merge adjacent text nodes
  });
  currentHighlights = [];
}

function highlightKeywords(keywords: string[], caseSensitive: boolean): string[] {
  clearHighlights();
  const foundMatches: string[] = [];
  if (!keywords.length) return foundMatches;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  const flags = caseSensitive ? 'g' : 'gi';
  const keywordPattern = keywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${keywordPattern})`, flags);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;

    if (!node.nodeValue || !regex.test(node.nodeValue)) continue;
    const frag = document.createDocumentFragment();
    const parts = node.nodeValue.split(regex);

    parts.forEach(part => {
      if (regex.test(part)) {
        const span = document.createElement('span');
        span.className = 'highlight';
        span.textContent = part;
        frag.appendChild(span);
        currentHighlights.push(span);
        foundMatches.push(part);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });

    if (parent) {
      parent.replaceChild(frag, node);
    }
  }

  return foundMatches;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'HIGHLIGHT_KEYWORDS') {
    const matches = highlightKeywords(msg.keywords, msg.caseSensitive);
    sendResponse({ count: matches.length, matches });
  } else if (msg.type === 'CLEAR_HIGHLIGHTS') {
    clearHighlights();
    sendResponse({ success: true });
  }
});
