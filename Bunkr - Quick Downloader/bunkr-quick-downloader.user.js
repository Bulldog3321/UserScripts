// ==UserScript==
// @name         Bunkr - Quick Downloader
// @description  One-click file downloads for Bunkr.
// @author       Bulldog
// @version      1.0
// @icon         https://bunkr.cr/images/fav.ico
// @namespace    https://github.com/Bulldog3321/UserScripts
// @homepageURL  https://github.com/Bulldog3321/UserScripts/tree/main/Bunkr%20-%20Quick%20Downloader
// @downloadURL  https://bulldog3321.github.io/UserScripts/Bunkr%20-%20Quick%20Downloader/bunkr-quick-downloader.user.js
// @supportURL   https://github.com/Bulldog3321/UserScripts/issues
// @match        https://*.bunkr.tld/*
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const SELECTORS = {
        albumFileLinks: '.theItem a[aria-label="download"]:not([data-bd])',
        dlPageDownloadBtn: "#download-btn",
        mediaContainer: ".theItem",
        dlLink: 'a.btn-main.btn-lg[href*="//dl."]',
    };

    const ICONS = {
        download: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#fff" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>',
        check: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#fff" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    };

    const CSS = `
        .bd-btn {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 10;
            display: flex;
            width: 26px;
            height: 26px;
            align-items: center;
            justify-content: center;
            background: #374151;
            color: #fff;
            transition: background 0.2s;
        }
        .bd-btn:hover {
            background: #4b5563;
        }
        .bd-btn.ok {
            background: #4caf50 !important;
        }
    `;

    document.head.appendChild(Object.assign(document.createElement("style"), { textContent: CSS }));

    const isAlbum = /\/a\//.test(location.pathname);
    const isDownloadPage = location.hostname.startsWith("dl.");

    const openDownload = (url) => GM_openInTab(url, { active: false });

    const createDownloadBtn = (link) => {
        const btn = Object.assign(document.createElement("button"), {
            className: "bd-btn",
            title: "Download in background",
            innerHTML: ICONS.download,
            async onclick(e) {
                e.preventDefault();
                e.stopPropagation();
                btn.innerHTML = ICONS.check;
                btn.classList.add("ok");
                setTimeout(() => { btn.innerHTML = ICONS.download; btn.classList.remove("ok"); }, 2000);

                try {
                    const res = await fetch(link.href);
                    const html = await res.text();
                    const dlLink = new DOMParser().parseFromString(html, "text/html")
                        .querySelector(SELECTORS.dlLink);
                    openDownload(dlLink?.href ?? link.href + "?download=true");
                } catch {
                    openDownload(link.href + "?download=true");
                }
            },
        });
        return btn;
    };

    const addAlbumBtns = (root) => {
        root.querySelectorAll(SELECTORS.albumFileLinks).forEach((link) => {
            link.dataset.bd = "1";
            const container = link.closest(SELECTORS.mediaContainer) ?? link.parentElement;
            container.style.position = "relative";
            container.append(createDownloadBtn(link));
        });
    };

    const handleDownloadPage = () => {
        const btn = document.querySelector(SELECTORS.dlPageDownloadBtn);
        if (btn) btn.click();
    };

    if (isAlbum) {
        new MutationObserver((mutations) => {
            mutations.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && addAlbumBtns(n)));
        }).observe(document.body, { childList: true, subtree: true });
        addAlbumBtns(document);
    } else if (isDownloadPage) {
        handleDownloadPage();
    }
})();
