class ContentHighlighter {
    constructor() {
        this.highlightClass = 'search-highlight';
        this.markers = new Set();
        this.currentQuery = null;
        this.observer = new MutationObserver(mutations => this.handleDOMChanges(mutations));
    }
    getMarkers() {
        return this.markers;
    }
    handleDOMChanges(mutations) {
        if (this.currentQuery) {
            this.highlightKeywords(this.currentQuery.keywords, this.currentQuery.caseSensitive);
        }
    }
    clearHighlights() {
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
    highlightKeywords(keywords, caseSensitive) {
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
                if (!node.textContent || !node.parentNode || this.isInForbiddenElement(node))
                    return;
                const wrapper = document.createElement('span');
                wrapper.innerHTML = node.textContent.replace(regex, '<mark class="$&">$1</mark>');
                const newNodes = Array.from(wrapper.childNodes);
                const markers = wrapper.querySelectorAll('mark');
                markers.forEach(marker => this.markers.add(marker));
                node.replaceWith(...newNodes);
            });
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
        catch (error) {
            console.error('Highlighting failed:', error);
        }
    }
    processTextNodes(callback) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => { var _a; return ((_a = node.textContent) === null || _a === void 0 ? void 0 : _a.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
        });
        let currentNode;
        while ((currentNode = walker.nextNode())) {
            callback(currentNode);
        }
    }
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    isInForbiddenElement(node) {
        var _a;
        return !!((_a = node.parentNode) === null || _a === void 0 ? void 0 : _a.closest('script, style, noscript, head'));
    }
}
const highlighter = new ContentHighlighter();
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
    }
    catch (error) {
        console.error('Message handling failed:', error);
        sendResponse({ count: 0, matches: [] });
    }
    return true;
});
export {};
//# sourceMappingURL=content.js.map