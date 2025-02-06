"use strict";
/// <reference lib="dom" />
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
        if (!keywords.length)
            return;
        this.clearHighlights();
        this.currentQuery = { keywords, caseSensitive };
        try {
            const flags = caseSensitive ? 'g' : 'gi';
            const pattern = keywords
                .map(k => k.trim())
                .filter(Boolean)
                .map(k => this.escapeRegex(k))
                .join('|');
            if (!pattern)
                return;
            const regex = new RegExp(`(${pattern})`, flags);
            this.processTextNodes(node => {
                if (!node.textContent || !node.parentNode || this.isInForbiddenElement(node))
                    return;
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                const text = node.textContent;
                regex.lastIndex = 0;
                while ((match = regex.exec(text)) !== null) {
                    if (match.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                    const mark = document.createElement('mark');
                    mark.className = this.highlightClass;
                    mark.textContent = match[0];
                    this.markers.add(mark);
                    fragment.appendChild(mark);
                    lastIndex = regex.lastIndex;
                }
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                }
                node.parentNode.replaceChild(fragment, node);
            });
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
        catch (error) {
            console.error('Highlighting error:', error);
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
    var _a;
    try {
        switch (message.action) {
            case 'search':
                if ((_a = message.keywords) === null || _a === void 0 ? void 0 : _a.length) {
                    highlighter.highlightKeywords(message.keywords, message.caseSensitive);
                    sendResponse({
                        count: highlighter.markers.size,
                        matches: Array.from(highlighter.markers).map(m => m.textContent || '')
                    });
                }
                break;
            case 'clear':
                highlighter.clearHighlights();
                sendResponse({ count: 0, matches: [] });
                break;
        }
    }
    catch (error) {
        console.error('Message handling error:', error);
        sendResponse({ count: 0, matches: [] });
    }
    return true;
});
chrome.runtime.onConnect.addListener(port => {
    console.log('Connected:', port.name);
    port.onDisconnect.addListener(() => console.log('Disconnected'));
});
//# sourceMappingURL=content.js.map