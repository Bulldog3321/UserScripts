// ==UserScript==
// @name         Civitai - URL Cleaner
// @description  Strips unnecessary model names from Civitai URLs and adds actions for clearing model versions and swapping between .com and .red domains.
// @author       Bulldog
// @version      1.0
// @icon         https://civitai.com/favicon.ico
// @namespace    https://github.com/Bulldog3321/UserScripts
// @homepageURL  https://github.com/Bulldog3321/UserScripts/tree/main/Civitai%20-%20URL%20Cleaner
// @downloadURL  https://bulldog3321.github.io/UserScripts/Civitai%20-%20URL%20Cleaner/civitai-url-cleaner.user.js
// @supportURL   https://github.com/Bulldog3321/UserScripts/issues
// @match        https://civitai.com/*
// @match        https://civitai.red/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const CONFIG = {
        SLUG_REGEX: /^(\/\w+\/\d+)\/[^/?#]+(.*)$/,
        TITLE_SELECTOR: "h1[class*='title']",
        ICONS: {
            COM: "https://civitai.com/favicon.ico",
            RED: "https://civitai.com/favicon-red.ico",
        },
    };

    const state = {
        cleanedLinks: new WeakSet(),
        pendingRoots: new Set(),
        flushScheduled: false,
        toggleButton: null,
    };

    function cleanPathname(pathname) {
        const match = pathname.match(CONFIG.SLUG_REGEX);
        return match ? match[1] + match[2] : null;
    }

    function cleanURL(raw) {
        try {
            const url = new URL(raw, location.href);
            const cleaned = cleanPathname(url.pathname);
            if (!cleaned) return null;
            url.pathname = cleaned;
            return url.toString();
        } catch {
            return null;
        }
    }

    function cleanAddressBar() {
        const cleaned = cleanPathname(location.pathname);
        if (cleaned !== null) {
            history.replaceState(
                history.state,
                "",
                cleaned + location.search + location.hash
            );
        }
    }

    function patchHistory(method) {
        const original = history[method].bind(history);
        history[method] = function (stateObj, title, url) {
            if (url) {
                const cleaned = cleanURL(String(url));
                if (cleaned) url = cleaned;
            }
            const result = original(stateObj, title, url);
            updateTitleState();
            updateSiteToggle();
            return result;
        };
    }

    function cleanAnchor(a) {
        if (state.cleanedLinks.has(a)) return;
        const cleaned = cleanURL(a.href);
        if (cleaned) {
            a.href = cleaned;
            state.cleanedLinks.add(a);
        }
    }

    function cleanAnchorsIn(root) {
        root.querySelectorAll("a[href]").forEach(cleanAnchor);
    }

    function scheduleFlush(root) {
        state.pendingRoots.add(root);
        if (!state.flushScheduled) {
            state.flushScheduled = true;
            queueMicrotask(() => {
                state.pendingRoots.forEach(cleanAnchorsIn);
                state.pendingRoots.clear();
                state.flushScheduled = false;
            });
        }
    }

    function ensureSiteToggle(titleElement) {
        const currentDomain = window.location.hostname;
        const targetDomain = currentDomain === "civitai.com" ? "civitai.red" : "civitai.com";
        const targetIcon = targetDomain === "civitai.com"
            ? CONFIG.ICONS.COM
            : CONFIG.ICONS.RED;
        const domainLabel = `.${targetDomain.split(".")[1]}`;

        let toggleButton = titleElement.previousElementSibling;
        if (!toggleButton || !toggleButton.classList.contains("site-toggle-btn")) {
            toggleButton = document.createElement("div");
            toggleButton.className = "cursor-pointer site-toggle-btn m_347db0ec mantine-Badge-root";
            toggleButton.setAttribute("data-variant", "light");
            toggleButton.setAttribute("data-size", "lg");
            toggleButton.setAttribute("data-with-left-section", "true");
            toggleButton.style.cssText = `
                padding-left: 3px;
                padding-right: 5px;
                --badge-height: var(--badge-height-lg);
                --badge-padding-x: var(--badge-padding-x-lg);
                --badge-fz: var(--badge-fz-lg);
                --badge-radius: var(--mantine-radius-sm);
                --badge-bg: var(--mantine-color-gray-light);
                --badge-color: var(--mantine-color-gray-light-color);
                --badge-bd: calc(0.0625rem * var(--mantine-scale)) solid transparent;
            `;
            toggleButton.setAttribute("title", `Switch to ${targetDomain}`);

            toggleButton.innerHTML = `
                <span class="m_91fdda9b mantine-Badge-section" style="margin-right: 4px;" data-position="left">
                    <img src="${targetIcon}" width="16" height="16" style="vertical-align: middle;" alt="${targetDomain} icon">
                </span>
                <span class="m_5add502a mantine-Badge-label">
                    <p class="mantine-focus-auto ${titleElement.className.split(' ').find(c => c.startsWith('___')) || ''} m_b6d8b162 mantine-Text-root">${domainLabel}</p>
                </span>
            `;

            toggleButton.addEventListener("click", () => {
                const url = new URL(window.location);
                window.location.href = `https://${targetDomain}${url.pathname + url.search + url.hash}`;
            });

            titleElement.parentNode.insertBefore(toggleButton, titleElement);
            state.toggleButton = toggleButton;
        }

        const img = toggleButton.querySelector("img");
        if (img) img.src = targetIcon;
        const label = toggleButton.querySelector(".mantine-Badge-label");
        if (label) label.textContent = domainLabel;
        toggleButton.title = `Switch to ${targetDomain}`;
    }

    function updateTitleState() {
        const titleElement = document.querySelector(CONFIG.TITLE_SELECTOR);
        if (!titleElement) return;

        const url = new URL(window.location);
        const hasVersion = url.searchParams.has("modelVersionId");

        titleElement.style.cursor = hasVersion ? "pointer" : "";
        titleElement.title = hasVersion ? "Click to reset version" : "";
    }

    function updateSiteToggle() {
        const titleElement = document.querySelector(CONFIG.TITLE_SELECTOR);
        if (!titleElement) return;
        ensureSiteToggle(titleElement);
    }

    function handleTitleClick(e) {
        const titleElement = e.target.closest(CONFIG.TITLE_SELECTOR);
        if (!titleElement) return;

        const url = new URL(window.location);
        if (url.searchParams.has("modelVersionId")) {
            url.searchParams.delete("modelVersionId");
            history.replaceState(history.state, "", url.toString());
            window.location.reload();
        }
    }

    const titleObserver = new MutationObserver((mutations) => {
        for (const { addedNodes } of mutations) {
            for (const node of addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                if (node.matches && node.matches(CONFIG.TITLE_SELECTOR)) {
                    updateTitleState();
                    updateSiteToggle();
                    return;
                }

                if (node.querySelector) {
                    const titleElement = node.querySelector(CONFIG.TITLE_SELECTOR);
                    if (titleElement) {
                        updateTitleState();
                        updateSiteToggle();
                        return;
                    }
                }
            }
        }
    });

    function startTitleObserver() {
        titleObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    function init() {
        cleanAnchorsIn(document);

        const linkObserver = new MutationObserver((mutations) => {
            for (const { addedNodes } of mutations) {
                for (const node of addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    scheduleFlush(
                        node.tagName === "A" ? (node.parentElement ?? node) : node
                    );
                }
            }
        });

        linkObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        cleanAddressBar();

        updateTitleState();
        updateSiteToggle();

        startTitleObserver();
    }

    patchHistory("pushState");
    patchHistory("replaceState");

    window.addEventListener("popstate", () => {
        cleanAddressBar();
        updateTitleState();
        updateSiteToggle();
    }, { passive: true });

    document.addEventListener("click", handleTitleClick);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
