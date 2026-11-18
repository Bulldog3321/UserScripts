// ==UserScript==
// @name         Linkify Plain-Text URLs
// @description  Converts plain-text URLs on any webpage into clickable links.
// @author       Bulldog
// @version      1.0
// @namespace    https://github.com/Bulldog3321/UserScripts
// @downloadURL  https://bulldog3321.github.io/UserScripts/Linkify%20Plain-Text%20URLs/linkify-plain-text-urls.user.js
// @supportURL   https://github.com/Bulldog3321/UserScripts/issues
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      data.iana.org
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const host = location.hostname;
    if (/^(localhost|127\.0\.0\.1|::1)$/.test(host)) return;

    const TLD_CACHE_KEY = "linkify_tlds";
    const TLD_CACHE_TTL = 86_400_000;
    const IANA_TLD_URL = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";

    const TLD_FALLBACK = new Set(["com", "net", "org", "gov", "xyz"]);
    const TLD_DENYLIST = new Set(["md", "zip"]);

    const CANDIDATE_RE = /(?<![=\\'"@\w])((?:https?|ftp):\/\/\S+|www\.\S+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+([a-zA-Z]{2,24})(?![a-zA-Z0-9-])(?:[/?#]\S*)?)/gi;
    const SKIP = new Set(["A", "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "BUTTON", "CODE", "PRE", "IFRAME", "OBJECT", "EMBED"]);
    const TRAIL_PUNCT = /[.,;:!?)'"]+$/;

    let tlds = TLD_FALLBACK;
    let observer = null;
    let rafPending = false;
    let pendingNodes = [];

    function linkifyText(textNode) {
        const text = textNode.nodeValue;
        if (!text.includes(".")) return;

        CANDIDATE_RE.lastIndex = 0;
        let match = CANDIDATE_RE.exec(text);
        if (!match) return;

        const frag = document.createDocumentFragment();
        let cursor = 0;
        let matched = false;

        do {
            let raw = match[1];
            const tld = match[2];

            if (tld && (!tlds.has(tld.toLowerCase()) || TLD_DENYLIST.has(tld.toLowerCase()))) continue;

            const trail = raw.match(TRAIL_PUNCT);
            if (trail) raw = raw.slice(0, -trail[0].length);

            const start = match.index;

            if (start > cursor) {
                frag.appendChild(document.createTextNode(text.slice(cursor, start)));
            }

            const href = /^(?:https?|ftp):\/\//i.test(raw) ? raw : "https://" + raw;
            const a = document.createElement("a");
            a.href = href;
            a.textContent = raw;
            a.rel = "noopener noreferrer";
            a.target = "_blank";
            a.title = `🔗 Linkified\n${href}`;
            frag.appendChild(a);

            cursor = start + raw.length;
            matched = true;
        } while ((match = CANDIDATE_RE.exec(text)) !== null);

        if (!matched) return;
        if (cursor < text.length) {
            frag.appendChild(document.createTextNode(text.slice(cursor)));
        }

        observer?.disconnect();
        textNode.parentNode.replaceChild(frag, textNode);
        reconnect();
    }

    function walkRoot(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
            acceptNode(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (SKIP.has(node.tagName) || node.isContentEditable) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_SKIP;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });

        const nodes = [];
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
        for (const node of nodes) linkifyText(node);
    }

    function reconnect() {
        if (!observer) return;
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function flushPending() {
        rafPending = false;
        const batch = pendingNodes.splice(0);
        for (const node of batch) {
            if (!node.isConnected) continue;
            if (node.nodeType === Node.TEXT_NODE) linkifyText(node);
            else walkRoot(node);
        }
    }

    function start() {
        observer = new MutationObserver((mutations) => {
            for (const { addedNodes } of mutations) {
                for (const node of addedNodes) {
                    if (
                        node.nodeType === Node.TEXT_NODE ||
                        node.nodeType === Node.ELEMENT_NODE
                    ) {
                        pendingNodes.push(node);
                    }
                }
            }
            if (!rafPending && pendingNodes.length) {
                rafPending = true;
                requestAnimationFrame(flushPending);
            }
        });

        walkRoot(document.body);
        reconnect();
    }

    // TLD bootstrap: cache > IANA > fallback

    function parseTlds(text) {
        const out = new Set();
        for (const line of text.split("\n")) {
            const l = line.trim().toLowerCase();
            if (l && !l.startsWith("#")) out.add(l);
        }
        return out;
    }

    function boot(tldSet) {
        tlds = tldSet;
        start();
    }

    function loadTldsFromCache() {
        const cached = GM_getValue(TLD_CACHE_KEY, null);
        if (cached && Date.now() - cached.ts < TLD_CACHE_TTL) {
            boot(new Set(cached.list));
            return true;
        }
        return false;
    }

    function fetchTlds() {
        GM_xmlhttpRequest({
            method: "GET",
            url: IANA_TLD_URL,
            timeout: 5000,
            onload(res) {
                try {
                    const set = parseTlds(res.responseText);
                    GM_setValue(TLD_CACHE_KEY, { ts: Date.now(), list: [...set] });
                    boot(set);
                } catch {
                    boot(TLD_FALLBACK);
                }
            },
            onerror() {
                boot(TLD_FALLBACK);
            },
            ontimeout() {
                boot(TLD_FALLBACK);
            },
        });
    }

    if (!loadTldsFromCache()) {
        fetchTlds();
    }
})();
