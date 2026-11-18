// ==UserScript==
// @name         GitHub - File/Folder/Gist Downloader
// @description  Download files and folders from repositories, download or copy Gists, and a Gist link on user profiles.
// @author       Bulldog
// @version      1.0
// @icon         https://github.githubassets.com/favicons/favicon-dark.svg
// @namespace    https://github.com/Bulldog3321/UserScripts
// @homepageURL  https://github.com/Bulldog3321/UserScripts/tree/main/GitHub%20-%20File%20Folder%20Gist%20Downloader
// @downloadURL  https://bulldog3321.github.io/UserScripts/GitHub%20-%20File%20Folder%20Gist%20Downloader/github-file-folder-gist-downloader.user.js
// @supportURL   https://github.com/Bulldog3321/UserScripts/issues
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      raw.githubusercontent.com
// @connect      gist.githubusercontent.com
// @connect      gist.github.com
// @connect      api.github.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const BOUND = "data-gh-dl";
    const GIST_BOUND = "data-gh-dl-gist";
    const TOOLBAR_BOUND = "data-gh-dl-toolbar";
    const PROFILE_BOUND = "data-gh-dl-profile";

    let activeMenuClose = null;
    let activeMenuUrl = null;

    const ICON_DOWNLOAD = `<svg data-component="Octicon" aria-hidden="true" focusable="false" class="octicon octicon-download" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path><path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path></svg>`;
    const ICON_COPY = `<svg data-component="Octicon" aria-hidden="true" focusable="false" class="octicon octicon-copy" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>`;
    const ICON_CHECK = `<svg data-component="Octicon" aria-hidden="true" focusable="false" class="octicon octicon-check" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>`;

    const style = document.createElement("style");
    style.id = "gh-dl-style";
    style.textContent = `
        .gh-dl-btn {
            display: inline-flex;
            align-items: center;
            margin-left: var(--base-size-8, 8px);
            vertical-align: text-bottom;
            cursor: pointer;
            color: var(--fgColor-muted);
            opacity: 0;
            transition: opacity .1s, color .1s;
        }
        .gh-dl-btn svg {
            fill: currentColor;
            width: 16px;
            height: 16px;
        }
        tr:hover .gh-dl-btn,
        [role="row"]:hover .gh-dl-btn,
        [class*="Row"]:hover .gh-dl-btn,
        .gh-dl-btn.gh-dl-open {
            opacity: 1;
        }
        .gh-dl-btn:hover,
        .gh-dl-btn.gh-dl-open,
        .gh-dl-btn:focus-visible {
            color: var(--fgColor-accent);
        }
        .gh-dl-btn:focus-visible {
            opacity: 1;
            outline: 2px solid var(--fgColor-accent);
            outline-offset: 1px;
            border-radius: var(--borderRadius-small, .1875rem);
        }
        @media (hover: none) {
            .gh-dl-btn {
                opacity: 1;
            }
        }

        .gh-dl-toolbar-btn svg {
            width: 18px;
            height: 18px;
            fill: var(--fgColor-muted);
        }
        .gh-dl-toolbar-btn.gh-dl-open {
            background-color: var(--button-invisible-bgColor-active, var(--control-transparent-bgColor-active));
        }

        #gh-dl-menu {
            position: fixed;
            z-index: 99999;
            background-color: var(--overlay-bgColor, var(--color-canvas-overlay));
            border-radius: var(--borderRadius-large, .75rem);
            box-shadow: var(--shadow-floating-small, var(--color-overlay-shadow));
            padding: var(--base-size-8, 8px);
            list-style: none;
            margin: 0;
        }
        #gh-dl-menu li button {
            display: flex;
            align-items: center;
            gap: var(--base-size-8, 8px);
            width: 100%;
            padding: 6px 8px;
            background: transparent;
            border: none;
            border-radius: var(--borderRadius-medium, .375rem);
            cursor: pointer;
            color: var(--fgColor-default);
            font-size: 14px;
            font-family: inherit;
            white-space: nowrap;
        }
        #gh-dl-menu li button:hover {
            background: var(--bgColor-neutral-muted);
        }
        #gh-dl-menu li button svg {
            fill: var(--fgColor-muted);
        }

        .gh-dl-pill {
            display: inline-flex;
        }
        .gh-dl-pill > * {
            border-radius: 0;
            border-right-width: 0;
        }
        .gh-dl-pill > *:first-child {
            border-radius: var(--borderRadius-medium, .375rem) 0 0 var(--borderRadius-medium, .375rem);
        }
        .gh-dl-pill > *:last-child {
            border-radius: 0 var(--borderRadius-medium, .375rem) var(--borderRadius-medium, .375rem) 0;
            border-right-width: 1px;
        }
        .gh-dl-copied svg {
            fill: var(--fgColor-success, #1a7f37);
        }
    `;
    document.head.appendChild(style);

    function ensureStyle() {
        if (!style.isConnected && !document.getElementById("gh-dl-style")) {
            document.head.appendChild(style);
        }
    }

    function parseGhPath(href) {
        try {
            return new URL(href, location.href).pathname.split("/").filter(Boolean);
        } catch {
            return null;
        }
    }

    function safeDecode(value) {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }

    function fileNameFromHref(href) {
        try {
            const parts = new URL(href, location.href).pathname
                .replace(/\/+$/, "")
                .split("/")
                .filter(Boolean);
            return safeDecode(parts.pop() || "");
        } catch {
            return "";
        }
    }

    function gistIdFromHref(href) {
        try {
            return (
                new URL(href, location.origin)
                    .pathname.split("/")
                    .filter(Boolean)[1] || null
            );
        } catch {
            return null;
        }
    }

    let pageRefUrl = null;
    let pageRef = null;
    function currentPageRef() {
        if (pageRefUrl === location.href) return pageRef;

        const dataElements = document.querySelectorAll(
            'script[data-target="react-app.embeddedData"]',
        );
        if (!dataElements.length) return null;

        pageRefUrl = location.href;
        pageRef = null;
        for (const data of dataElements) {
            try {
                const payload = JSON.parse(data.textContent)?.payload;
                const ref =
                    payload?.codeViewTreeRoute?.refName ||
                    payload?.codeViewBlobLayoutRoute?.refName;
                if (ref) {
                    pageRef = ref;
                    break;
                }
            } catch {
            }
        }
        return pageRef;
    }

    function toRawUrl(href) {
        const p = parseGhPath(href);
        if (!p || p[2] !== "blob" || p.length < 5) return null;
        const [owner, repo, , ...rest] = p;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${rest.join("/")}`;
    }

    function toApiUrl(href, knownRef) {
        const p = parseGhPath(href);
        if (!p || (p[2] !== "blob" && p[2] !== "tree") || p.length < 4) return null;
        const [owner, repo, , ...tail] = p;

        let ref = tail[0];
        let rest = tail.slice(1);
        if (knownRef) {
            const refParts = knownRef
                .split("/")
                .filter(Boolean)
                .map(encodeURIComponent);
            if (
                refParts.length &&
                refParts.every((part, i) => tail[i] === part)
            ) {
                ref = knownRef;
                rest = tail.slice(refParts.length);
            }
        }

        return `https://api.github.com/repos/${owner}/${repo}/contents${rest.length ? `/${rest.join("/")}` : ""}?ref=${encodeURIComponent(ref)}`;
    }

    const KB = 1024;
    const MB = 1024 * 1024;
    const GB = 1024 * 1024 * 1024;
    function formatSize(bytes) {
        if (bytes < KB) return `${bytes} B`;
        if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
        if (bytes < GB) return `${(bytes / KB / KB).toFixed(1)} MB`;
        return `${(bytes / KB / KB / KB).toFixed(1)} GB`;
    }

    function ghGet(url, cb) {
        GM_xmlhttpRequest({
            method: "GET",
            url,
            headers: { Accept: "application/vnd.github+json" },
            onload(res) {
                try {
                    cb(JSON.parse(res.responseText));
                } catch {
                    cb(null);
                }
            },
            onerror() {
                cb(null);
            },
        });
    }

    function downloadFile(url, name) {
        GM_xmlhttpRequest({
            method: "GET",
            url,
            responseType: "blob",
            onload(res) {
                try {
                    if (res.status >= 400) {
                        console.error(`[gh-dl] Download failed (${res.status}): ${url}`);
                        return;
                    }
                    if (res.response == null) {
                        console.error(`[gh-dl] Empty response for ${url}`);
                        return;
                    }
                    const blob =
                        res.response instanceof Blob
                            ? res.response
                            : new Blob([res.response]);
                    const blobUrl = URL.createObjectURL(blob);
                    const a = Object.assign(document.createElement("a"), {
                        href: blobUrl,
                        download: name,
                        style: "display:none",
                    });
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                } catch (err) {
                    console.error(`[gh-dl] Download failed: ${url}`, err);
                }
            },
            onerror() {
                console.error(`[gh-dl] Download failed: ${url}`);
            },
        });
    }

    function copyText(text, cb) {
        if (typeof GM_setClipboard === "function") {
            try {
                GM_setClipboard(text);
                cb(true);
                return;
            } catch (err) {
                console.error("[gh-dl] Clipboard write failed", err);
            }
        }
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(
                () => cb(true),
                (err) => {
                    console.error("[gh-dl] Clipboard write failed", err);
                    cb(false);
                },
            );
            return;
        }
        cb(false);
    }

    function attachSizeTooltip(el, baseTitle, getFn) {
        el.title = baseTitle;
        let fetched = false;
        el.addEventListener("mouseenter", () => {
            if (fetched) return;
            fetched = true;
            getFn((bytes, approx) => {
                if (bytes !== null)
                    el.title = `${baseTitle}\n(${approx ? "~" : ""}${formatSize(bytes)})`;
            });
        });
    }

    function repoFileSize(apiUrl) {
        return (cb) =>
            ghGet(apiUrl, (j) =>
                cb(typeof j?.size === "number" ? j.size : null),
            );
    }
    function repoFolderSize(apiUrl) {
        return (cb) =>
            ghGet(apiUrl, (j) =>
                cb(
                    Array.isArray(j) ? j.reduce((s, i) => s + (i.size || 0), 0) : null,
                    true,
                ),
            );
    }
    const GIST_CACHE_MAX = 50;
    const gistCache = new Map();
    function cachedGistFileSize(gistApi, filename) {
        return (cb) => {
            if (gistCache.has(gistApi)) {
                const j = gistCache.get(gistApi);
                const size = j?.files?.[filename]?.size;
                cb(typeof size === "number" ? size : null, false);
                return;
            }
            ghGet(gistApi, (j) => {
                if (j?.files) {
                    if (gistCache.size >= GIST_CACHE_MAX) {
                        gistCache.delete(gistCache.keys().next().value);
                    }
                    gistCache.set(gistApi, j);
                }
                const size = j?.files?.[filename]?.size;
                cb(typeof size === "number" ? size : null, false);
            });
        };
    }

    function toggleFolderMenu(anchor, getGithubUrl, onClose) {
        if (activeMenuClose && activeMenuUrl !== location.href) {
            activeMenuClose();
        }
        if (activeMenuClose) {
            activeMenuClose();
            return;
        }

        const githubUrl =
            typeof getGithubUrl === "function" ? getGithubUrl() : getGithubUrl;
        if (!githubUrl) {
            onClose?.();
            return;
        }

        const menu = document.createElement("ul");
        menu.id = "gh-dl-menu";

        let dismiss = null;
        let keydown = null;
        const close = () => {
            menu.remove();
            if (dismiss) document.removeEventListener("click", dismiss, true);
            if (keydown) document.removeEventListener("keydown", keydown, true);
            activeMenuClose = null;
            activeMenuUrl = null;
            onClose?.();
        };

        [
            {
                label: "Download via DownGit",
                href: `https://minhaskamal.github.io/DownGit/#/home?url=${encodeURIComponent(githubUrl)}`,
            },
            {
                label: "Download via download-directory",
                href: `https://download-directory.github.io/?url=${encodeURIComponent(githubUrl)}`,
            },
        ].forEach(({ label, href }) => {
            const li = document.createElement("li");
            const btn = document.createElement("button");
            btn.type = "button";
            btn.innerHTML = ICON_DOWNLOAD + label;
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(href, "_blank", "noopener");
                close();
            });
            li.appendChild(btn);
            menu.appendChild(li);
        });

        document.documentElement.appendChild(menu);
        activeMenuClose = close;
        activeMenuUrl = location.href;

        const r = anchor.getBoundingClientRect();
        const mw = menu.offsetWidth || 220;
        const mh = menu.offsetHeight || 80;
        const top =
            r.bottom + mh > window.innerHeight
                ? Math.max(8, r.top - mh - 4)
                : r.bottom + 4;
        menu.style.top = `${top}px`;
        menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - mw - 8))}px`;

        dismiss = (e) => {
            if (menu.contains(e.target) || anchor.contains(e.target)) return;
            close();
        };
        keydown = (e) => {
            if (e.key === "Escape") close();
        };
        setTimeout(() => {
            if (!menu.isConnected) return;
            document.addEventListener("click", dismiss, true);
            document.addEventListener("keydown", keydown, true);
        }, 0);
    }

    function onFolderClick(btn, getUrl) {
        return (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (activeMenuClose && activeMenuUrl !== location.href) {
                activeMenuClose();
            }
            const opening = !activeMenuClose;
            btn.classList.toggle("gh-dl-open", opening);
            toggleFolderMenu(btn, getUrl, () =>
                btn.classList.remove("gh-dl-open"),
            );
        };
    }

    function bindRow(link, isFile) {
        if (link.textContent.trim() === "..") return;
        if (!link.closest('tr, [role="row"], [class*="Row"], [class*="row"]'))
            return;

        const name =
            fileNameFromHref(link.href) || (isFile ? "file" : "folder");
        const apiUrl = toApiUrl(link.href, currentPageRef());
        const raw = isFile ? toRawUrl(link.href) : null;
        if (isFile && !raw) return;

        const btn = document.createElement("span");
        btn.className = "gh-dl-btn";
        btn.setAttribute("role", "button");
        btn.tabIndex = 0;
        btn.innerHTML = ICON_DOWNLOAD;
        btn.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                btn.click();
            }
        });
        link.insertAdjacentElement("afterend", btn);

        const sizeGetter = apiUrl
            ? isFile
                ? repoFileSize(apiUrl)
                : repoFolderSize(apiUrl)
            : (cb) => cb(null, false);

        if (isFile) {
            btn.setAttribute("aria-label", `Download ${name}`);
            attachSizeTooltip(btn, `Download ${name}`, sizeGetter);
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                downloadFile(raw, name);
            });
        } else {
            btn.setAttribute("aria-label", `Download folder "${name}"`);
            attachSizeTooltip(btn, `Download folder "${name}"`, sizeGetter);
            btn.addEventListener("click", onFolderClick(btn, link.href));
        }
    }

    function bindFolderToolbar() {
        if (!location.pathname.includes("/tree/")) return;

        const copyBtn = document.querySelector(
            `div[data-testid="breadcrumbs-filename"] + button:not([${TOOLBAR_BOUND}])`,
        );
        if (!copyBtn) return;
        copyBtn.setAttribute(TOOLBAR_BOUND, "1");

        const btn = copyBtn.cloneNode(false);
        btn.removeAttribute("id");
        btn.removeAttribute("aria-label");
        btn.removeAttribute("aria-labelledby");
        btn.removeAttribute("aria-haspopup");
        btn.removeAttribute("aria-expanded");
        btn.removeAttribute("data-testid");
        btn.setAttribute("type", "button");
        btn.setAttribute("aria-label", "Download folder");
        btn.classList.add("gh-dl-toolbar-btn");
        btn.innerHTML = ICON_DOWNLOAD;
        attachSizeTooltip(btn, "Download folder", (cb) => {
            const apiUrl = toApiUrl(location.href, currentPageRef());
            if (!apiUrl) return cb(null, false);
            repoFolderSize(apiUrl)(cb);
        });
        btn.addEventListener("click", onFolderClick(btn, () => location.href));

        copyBtn.insertAdjacentElement("afterend", btn);
    }

    function bindGistButtons() {
        if (location.hostname !== "gist.github.com") return;

        const GIST_BTN_CLASS =
            "Button Button--secondary Button--small Button--iconOnly";
        const visual = (icon) =>
            `<span class="Button-content"><span class="Button-visual">${icon}</span></span>`;

        document
            .querySelectorAll(`a[href*="/raw/"]:not([${GIST_BOUND}])`)
            .forEach((rawLink) => {
                if (!/^Raw$/i.test(rawLink.textContent.trim())) return;
                rawLink.setAttribute(GIST_BOUND, "1");

                const rawHref = rawLink.getAttribute("href");
                const rawUrl = new URL(rawHref, location.origin).href;
                const filename = fileNameFromHref(rawUrl) || "file";
                const gistId = gistIdFromHref(rawHref);
                const gistApi = gistId
                    ? `https://api.github.com/gists/${gistId}`
                    : null;

                const dlBtn = createGistBtn(
                    `Download ${filename}`,
                    ICON_DOWNLOAD,
                    (e) => {
                        e.preventDefault();
                        downloadFile(rawUrl, filename);
                    },
                );
                attachSizeTooltip(
                    dlBtn,
                    `Download ${filename}`,
                    gistApi
                        ? cachedGistFileSize(gistApi, filename)
                        : (cb) => cb(null, false),
                );

                const cpBtn = createGistCopyBtn(
                    `Copy ${filename}`,
                    ICON_COPY,
                    (e) => {
                        e.preventDefault();
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: rawUrl,
                            onload(res) {
                                if (res.status >= 400) {
                                    console.error(
                                        `[gh-dl] Copy failed (${res.status}): ${rawUrl}`,
                                    );
                                    return;
                                }
                                copyText(res.responseText, (ok) => {
                                    if (!ok) return;
                                    cpBtn.innerHTML = visual(ICON_CHECK);
                                    cpBtn.classList.add("gh-dl-copied");
                                    setTimeout(() => {
                                        cpBtn.innerHTML = visual(ICON_COPY);
                                        cpBtn.classList.remove("gh-dl-copied");
                                    }, 2000);
                                });
                            },
                            onerror() {
                                console.error(`[gh-dl] Copy failed: ${rawUrl}`);
                            },
                        });
                    },
                );

                const pill = document.createElement("span");
                pill.className = "gh-dl-pill";
                rawLink.replaceWith(pill);
                pill.appendChild(dlBtn);
                pill.appendChild(cpBtn);
                pill.appendChild(rawLink);
            });

        function createGistBtn(label, icon, onClick) {
            const btn = document.createElement("a");
            btn.href = "#";
            btn.className = GIST_BTN_CLASS;
            btn.setAttribute("aria-label", label);
            btn.innerHTML = visual(icon);
            btn.addEventListener("click", onClick);
            return btn;
        }

        function createGistCopyBtn(label, icon, onClick) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = GIST_BTN_CLASS;
            btn.title = label;
            btn.setAttribute("aria-label", label);
            btn.innerHTML = visual(icon);
            btn.addEventListener("click", onClick);
            return btn;
        }
    }

    function bindGistProfileButton() {
        if (location.hostname !== "github.com") return;
        const parts = location.pathname.split("/").filter(Boolean);
        if (parts.length !== 1) return;

        const socialList = document.querySelector(
            `.js-profile-editable-area ul.vcard-details:not([${PROFILE_BOUND}])`,
        );
        if (!socialList) return;
        socialList.setAttribute(PROFILE_BOUND, "1");

        const btn = document.createElement("a");
        btn.href = `https://gist.github.com/${parts[0]}`;
        btn.textContent = "View Gist Profile";
        btn.className = "btn btn-block";
        btn.style.marginTop = "var(--base-size-16, 16px)";
        socialList.insertAdjacentElement("afterend", btn);
    }

    function bind() {
        ensureStyle();
        if (activeMenuClose && activeMenuUrl !== location.href) {
            activeMenuClose();
        }
        document
            .querySelectorAll(
                `a[href*="/blob/"]:not([${BOUND}]), a[href*="/tree/"]:not([${BOUND}])`,
            )
            .forEach((link) => {
                link.setAttribute(BOUND, "1");
                bindRow(link, link.href.includes("/blob/"));
            });
        bindFolderToolbar();
        bindGistButtons();
        bindGistProfileButton();
    }

    bind();

    let debounceTimer;
    new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(bind, 300);
    }).observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener("turbo:load", bind);
    document.addEventListener("turbo:render", bind);
})();
