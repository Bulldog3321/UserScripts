// ==UserScript==
// @name         Spotify - Music Downloader
// @description  Download Spotify songs from various third-party providers.
// @author       Bulldog
// @version      1.0
// @icon         https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico
// @namespace    https://github.com/Bulldog3321/UserScripts
// @homepageURL  https://github.com/Bulldog3321/UserScripts/tree/main/Spotify%20-%20Music%20Downloader
// @downloadURL  https://bulldog3321.github.io/UserScripts/Spotify%20-%20Music%20Downloader/spotify-music-downloader.user.js
// @supportURL   https://github.com/Bulldog3321/UserScripts/issues
// @match        https://open.spotify.com/*
// @match        https://tidal.odskyler.com/*
// @match        https://saavn.squid.wtf/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const SEARCH_HANDOFF_HOSTS = new Set(['tidal.odskyler.com', 'saavn.squid.wtf']);

    function runSearchHandoff() {
        if (!SEARCH_HANDOFF_HOSTS.has(location.hostname)) return false;

        const url = new URL(location.href);
        const query = url.searchParams.get('q');
        if (!query) return true;

        url.searchParams.delete('q');
        history.replaceState(null, '', url.pathname + url.search + url.hash);

        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (!setValue) return true;

        const fill = () => {
            const input = document.querySelector(
                'input[type="search"], input[type="text"], input[placeholder*="search" i]'
            );
            if (!input) return false;

            setValue.call(input, '');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            setValue.call(input, query);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
            return true;
        };

        if (fill() || !document.documentElement) return true;

        let timeout = 0;
        const observer = new MutationObserver(() => {
            if (!fill()) return;
            observer.disconnect();
            clearTimeout(timeout);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        timeout = setTimeout(() => observer.disconnect(), 15000);
        return true;
    }

    if (runSearchHandoff()) return;

    const LUCIDA_ICON = 'data:image/png;base64,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';

    const SERVICE_GROUPS = [
        {
            id: 'lucida',
            name: 'Lucida',
            icon: LUCIDA_ICON,
            default: 'amazon',
            urlTemplate: 'https://lucida.to/?url={url}&country=auto&to={service}',
            services: {
                'qobuz':      { name: 'Qobuz' },
                'tidal':      { name: 'Tidal' },
                'soundcloud': { name: 'SoundCloud' },
                'deezer':     { name: 'Deezer' },
                'amazon':     { name: 'Amazon' },
                'yandex':     { name: 'Yandex' }
            }
        },
        {
            id: 'dd',
            name: 'DoubleDouble',
            icon: 'https://us.doubledouble.top/record.png',
            services: {
                'dd-us': { name: 'DoubleDouble US', label: 'US Region',     urlTemplate: 'https://us.doubledouble.top/?url={url}' },
                'dd-eu': { name: 'DoubleDouble EU', label: 'Europe Region', urlTemplate: 'https://eu.doubledouble.top/?url={url}' }
            }
        },
        {
            id: 'squid',
            name: 'SQUID.WTF',
            icon: 'https://status.squid-board.org/assets/images/86lvey0S2nVxOtPp.png',
            services: {
                'squid-tidal': { name: 'SQUID.WTF Tidal',    label: 'Tidal',     urlTemplate: 'https://tidal.odskyler.com/?q={query}' },
                'squid-saavn': { name: 'SQUID.WTF JioSaavn', label: 'JioSaavn', urlTemplate: 'https://saavn.squid.wtf/?q={query}' }
            }
        },
        {
            id: 'monochrome',
            name: 'Monochrome',
            icon: 'https://monochrome.st/assets/monochrome_logo-CZupkp5H.svg',
            urlTemplate: 'https://monochrome.st/search/{query}',
            services: {
                'monochrome': { name: 'Monochrome' }
            }
        }
    ];

    const SERVICES = new Map();
    for (const group of SERVICE_GROUPS) {
        for (const [key, service] of Object.entries(group.services)) {
            SERVICES.set(key, { ...service, urlTemplate: service.urlTemplate || group.urlTemplate });
        }
    }

    const GROUPS_BY_ID = new Map(SERVICE_GROUPS.map(group => [group.id, group]));

    function hasOptions(group) {
        return Object.keys(group.services).length > 1;
    }

    function getServiceLabel(serviceKey) {
        const service = SERVICES.get(serviceKey);
        return service?.label || service?.name || serviceKey;
    }

    const SELECTION_PREFIX = 'spotify-dl-svc-';

    function getGroupSelection(group) {
        const defaultKey = group.default && group.services[group.default]
            ? group.default
            : Object.keys(group.services)[0];

        try {
            const stored = localStorage.getItem(SELECTION_PREFIX + group.id);
            return stored && group.services[stored] ? stored : defaultKey;
        } catch {
            return defaultKey;
        }
    }

    function setGroupSelection(group, serviceKey) {
        try {
            localStorage.setItem(SELECTION_PREFIX + group.id, serviceKey);
        } catch {
        }
    }

    try {
        const legacy = localStorage.getItem('spotify-download-service');
        if (legacy) {
            for (const group of SERVICE_GROUPS) {
                if (group.services[legacy]) setGroupSelection(group, legacy);
            }
            localStorage.removeItem('spotify-download-service');
        }
    } catch {
    }

    let dropdownElement = null;
    let menuButton = null;
    let pickerElement = null;
    let pickerButton = null;
    let pickerTrack = null;

    const STYLE = `
        [data-testid="tracklist-row"] {
            position: relative;
        }
        [data-testid="tracklist-row"] > [role="gridcell"]:last-child {
            position: relative;
            display: flex;
            align-items: center;
        }

        .download-btn.download-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            align-self: center;
            width: 16px;
            height: 16px;
            margin-right: 8px;
            padding: 0;
            border: none;
            background: none;
            cursor: pointer;
            opacity: 0;
            flex-shrink: 0;
        }
        .download-btn.download-btn > .e-10810-button__icon-wrapper {
            position: static;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            padding: 0;
            inset: auto;
        }
        .download-btn:hover,
        .download-btn:focus-visible,
        .download-btn.active,
        [data-testid="tracklist-row"]:hover .download-btn,
        div[role="row"][aria-selected="true"] .download-btn {
            opacity: 1;
        }
        .download-btn.active {
            color: var(--text-base);
            transform: scale(var(--encore-button-hover-scale, 1.04));
        }
        .download-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
        .download-btn:focus-visible,
        .service-menu-button:focus-visible,
        .service-menu-header:focus-visible,
        .service-menu-item:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 1px;
        }

        .service-menu-button {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            border-radius: 50%;
            overflow: visible;
            z-index: 10001;
            color: var(--text-subdued, #a7a7a7);
            transition: background-color 0.2s ease, transform 0.3s ease;
        }
        .service-menu-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: var(--text-base, #ffffff);
        }
        .service-menu-button svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
            transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .service-menu-button:hover svg,
        .service-menu-button.clicked svg {
            transform: rotate(360deg);
        }
        .service-menu-button.clicked {
            transform: scale(1.15);
        }
        .service-menu-dropdown,
        .service-picker,
        .service-submenu {
            background-color: #242424;
            border-radius: 4px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            padding: 8px 0;
            min-width: fit-content;
        }
        .service-menu-dropdown,
        .service-picker {
            position: fixed;
            max-width: calc(100vw - 16px);
            z-index: 10000;
            display: none;
        }
        .service-menu-dropdown.show,
        .service-picker.show {
            display: block;
        }
        .service-picker {
            z-index: 10003;
        }
        .service-menu-title,
        .service-picker-title {
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: var(--text-subdued, #a7a7a7);
        }
        .service-menu-group {
            position: relative;
        }
        .service-menu-group + .service-menu-group {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .service-menu-header {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            height: 40px;
            box-sizing: border-box;
            padding: 0 16px;
            border: none;
            background: none;
            font: inherit;
            font-size: 14px;
            font-weight: 700;
            color: var(--text-base, #ffffff);
            text-align: left;
            cursor: default;
        }
        button.service-menu-header {
            cursor: pointer;
        }
        .service-menu-group:hover > .service-menu-header,
        .service-menu-group.open > .service-menu-header {
            background-color: rgba(255, 255, 255, 0.08);
        }
        .service-menu-group::after {
            content: '';
            position: absolute;
            left: 100%;
            top: 0;
            width: 8px;
            height: 100%;
            display: none;
        }
        .service-menu-header-icon {
            width: 16px;
            height: 16px;
            object-fit: contain;
            flex-shrink: 0;
        }
        .service-menu-group-current {
            margin-left: auto;
            font-size: 12px;
            font-weight: 400;
            letter-spacing: 0;
            text-transform: none;
            color: var(--text-subdued, #a7a7a7);
        }
        .service-menu-chevron {
            width: 16px;
            height: 16px;
            margin-left: 2px;
            flex-shrink: 0;
            fill: currentColor;
            color: var(--text-subdued, #a7a7a7);
        }
        .service-menu-group:hover .service-menu-group-current,
        .service-menu-group:hover .service-menu-chevron {
            color: var(--text-base, #ffffff);
        }
        .service-submenu {
            position: absolute;
            left: calc(100% + 8px);
            top: 0;
            min-width: 160px;
            z-index: 10002;
            display: none;
        }
        .service-menu-group.flip > .service-submenu {
            left: auto;
            right: calc(100% + 8px);
        }
        .service-menu-group.flip::after {
            left: auto;
            right: 100%;
        }
        @media (hover: hover) {
            .service-menu-group:hover > .service-submenu,
            .service-menu-group:hover::after {
                display: block;
            }
        }
        .service-menu-group.open > .service-submenu,
        .service-menu-group.open::after {
            display: block;
        }
        .service-menu-item {
            position: relative;
            display: flex;
            align-items: center;
            width: 100%;
            height: 40px;
            box-sizing: border-box;
            padding: 0 16px;
            border: none;
            background: none;
            font: inherit;
            color: inherit;
            text-align: left;
            white-space: nowrap;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s, color 0.2s;
        }
        .service-menu-item:hover {
            background-color: rgba(255, 255, 255, 0.08);
        }
        .service-menu-item.active {
            background-color: rgba(30, 215, 96, 0.15);
            color: #1ed760;
        }
        .service-menu-item-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-base, #ffffff);
            transition: color 0.2s;
        }
        .service-menu-item.active .service-menu-item-name {
            color: #1ed760;
            font-weight: 600;
        }
        .service-menu-item-check {
            margin-left: auto;
            flex-shrink: 0;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .service-menu-item.active .service-menu-item-check {
            opacity: 1;
        }
        .service-menu-item-check svg {
            width: 16px;
            height: 16px;
            fill: #1ed760;
        }
        .service-picker .service-menu-header-icon {
            margin-right: 8px;
        }
    `;

    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    const DOWNLOAD_ICON =
        '<svg data-encore-id="icon" role="img" aria-hidden="true" class="e-10810-icon" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12"/><path d="M12 6.05a1 1 0 0 1 1 1v7.486l1.793-1.793a1 1 0 1 1 1.414 1.414L12 18.364l-4.207-4.207a1 1 0 1 1 1.414-1.414L11 14.536V7.05a1 1 0 0 1 1-1"/></svg>';

    const GEAR_ICON =
        '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/></svg>';

    const CHECK_ICON =
        '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

    const CHEVRON_ICON =
        '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';

    // Last-resort icon, so a group never renders as a broken image
    const FALLBACK_ICON =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23a7a7a7' d='M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z'/%3E%3C/svg%3E";

    function setGroupIcon(img, group) {
        const urls = [...new Set(
            [group.icon, ...(group.iconFallbacks || []), FALLBACK_ICON].filter(Boolean)
        )];
        let index = 0;

        img.addEventListener('error', () => {
            index += 1;
            if (index < urls.length) img.src = urls[index];
        });

        img.src = urls[0];
    }

    function getTrackUrl(trackRow) {
        const href = trackRow.querySelector('a[data-testid="internal-track-link"]')?.getAttribute('href');
        if (!href) return null;
        try {
            return new URL(href, location.origin).href;
        } catch {
            return null;
        }
    }

    function getTrackArtists(trackRow) {
        const linked = [...trackRow.querySelectorAll('a[href*="/artist/"]')]
            .map(link => link.textContent.trim())
            .filter(Boolean);
        if (linked.length) return [...new Set(linked)].join(', ');

        const playLabel = trackRow.querySelector('button[aria-label^="Play "]')?.getAttribute('aria-label');
        const match = playLabel?.match(/^Play .* by (.+)$/);
        if (match) return match[1];

        return document.querySelector('[data-testid="entityTitle"], [data-testid="artist-page"] h1')
            ?.textContent?.trim() || '';
    }

    function getTrackInfo(trackRow) {
        const trackLink = trackRow.querySelector('a[data-testid="internal-track-link"]');
        if (!trackLink) return null;

        const title = trackLink.querySelector('[data-encore-id="text"]')?.textContent?.trim()
            || trackLink.textContent?.trim();
        return title ? { title, artists: getTrackArtists(trackRow) } : null;
    }

    function getTrackData(trackRow) {
        const url = getTrackUrl(trackRow);
        const info = url && getTrackInfo(trackRow);
        return info ? { url, ...info } : null;
    }

    function getTrackLabel(track) {
        return track.artists ? `${track.title} by ${track.artists}` : track.title;
    }

    function buildDownloadUrl(track, serviceKey) {
        const service = SERVICES.get(serviceKey);
        if (!service?.urlTemplate) return null;

        const query = [track.title, track.artists].filter(Boolean).join(' ');
        return service.urlTemplate
            .replaceAll('{service}', serviceKey)
            .replaceAll('{url}', encodeURIComponent(track.url))
            .replaceAll('{query}', encodeURIComponent(query));
    }

    function startDownload(track, serviceKey) {
        const url = buildDownloadUrl(track, serviceKey);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }

    function createMenuItem({ label, value, iconGroup, withCheck = false, active = false, onClick }) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'service-menu-item';
        if (value) item.dataset.service = value;
        if (active) item.classList.add('active');

        if (iconGroup) {
            const icon = document.createElement('img');
            icon.className = 'service-menu-header-icon';
            icon.alt = '';
            setGroupIcon(icon, iconGroup);
            item.appendChild(icon);
        }

        const name = document.createElement('span');
        name.className = 'service-menu-item-name';
        name.textContent = label;
        item.appendChild(name);

        if (withCheck) {
            const check = document.createElement('span');
            check.className = 'service-menu-item-check';
            check.innerHTML = CHECK_ICON;
            item.appendChild(check);
        }

        item.addEventListener('click', (event) => {
            event.stopPropagation();
            onClick();
        });

        return item;
    }

    function closeSubmenus() {
        if (!dropdownElement) return;

        dropdownElement.querySelectorAll('.service-menu-group.open').forEach(groupContainer => {
            groupContainer.classList.remove('open');
            groupContainer.querySelector('.service-menu-header')?.setAttribute('aria-expanded', 'false');
        });
    }

    function placeSubmenu(groupContainer) {
        const submenu = groupContainer.querySelector('.service-submenu');
        if (!submenu) return;

        groupContainer.classList.remove('flip');
        submenu.style.top = '';
        submenu.style.display = 'block';

        const groupRect = groupContainer.getBoundingClientRect();
        const submenuWidth = submenu.offsetWidth;
        const fitsRight = groupRect.right + 8 + submenuWidth <= window.innerWidth - 8;
        const fitsLeft = groupRect.left - 8 - submenuWidth >= 8;
        groupContainer.classList.toggle('flip', !fitsRight && fitsLeft);

        const submenuRect = submenu.getBoundingClientRect();
        const bottomOverflow = submenuRect.bottom - (window.innerHeight - 8);
        if (bottomOverflow > 0) {
            submenu.style.top = `${Math.max(-bottomOverflow, 8 - submenuRect.top)}px`;
        }

        submenu.style.display = '';
    }

    function createServiceMenu() {
        dropdownElement = document.createElement('div');
        dropdownElement.className = 'service-menu-dropdown';

        const title = document.createElement('div');
        title.className = 'service-menu-title';
        title.textContent = 'Download Services';
        dropdownElement.appendChild(title);

        for (const group of SERVICE_GROUPS) {
            const groupContainer = document.createElement('div');
            groupContainer.className = 'service-menu-group';
            groupContainer.dataset.groupId = group.id;

            const hasSubmenu = hasOptions(group);
            const header = document.createElement(hasSubmenu ? 'button' : 'div');
            header.className = 'service-menu-header';

            const icon = document.createElement('img');
            icon.className = 'service-menu-header-icon';
            icon.alt = '';
            setGroupIcon(icon, group);

            const name = document.createElement('span');
            name.textContent = group.name;

            header.append(icon, name);
            groupContainer.appendChild(header);

            if (hasSubmenu) {
                header.type = 'button';
                header.setAttribute('aria-haspopup', 'true');
                header.setAttribute('aria-expanded', 'false');

                const selection = getGroupSelection(group);

                const current = document.createElement('span');
                current.className = 'service-menu-group-current';
                current.textContent = getServiceLabel(selection);
                header.appendChild(current);

                const chevron = document.createElement('span');
                chevron.className = 'service-menu-chevron';
                chevron.innerHTML = CHEVRON_ICON;
                header.appendChild(chevron);

                const submenu = document.createElement('div');
                submenu.className = 'service-submenu';

                for (const key of Object.keys(group.services)) {
                    submenu.appendChild(createMenuItem({
                        label: getServiceLabel(key),
                        value: key,
                        withCheck: true,
                        active: key === selection,
                        onClick: () => {
                            setGroupSelection(group, key);
                            updateServiceMenu();
                        }
                    }));
                }

                groupContainer.appendChild(submenu);

                header.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const isOpen = groupContainer.classList.contains('open');
                    closeSubmenus();
                    if (!isOpen) {
                        groupContainer.classList.add('open');
                        header.setAttribute('aria-expanded', 'true');
                        placeSubmenu(groupContainer);
                    }
                });
                groupContainer.addEventListener('mouseenter', () => placeSubmenu(groupContainer));
            }

            dropdownElement.appendChild(groupContainer);
        }

        document.body.appendChild(dropdownElement);
    }

    function updateServiceMenu() {
        if (!dropdownElement) return;

        dropdownElement.querySelectorAll('.service-menu-group').forEach(groupContainer => {
            const group = GROUPS_BY_ID.get(groupContainer.dataset.groupId);
            if (!group) return;

            const selection = getGroupSelection(group);
            groupContainer.querySelectorAll('.service-menu-item').forEach(item => {
                item.classList.toggle('active', item.dataset.service === selection);
            });

            const current = groupContainer.querySelector('.service-menu-group-current');
            if (current) current.textContent = getServiceLabel(selection);
        });
    }

    function positionMenu(menu, anchor) {
        if (!menu || !anchor) return;

        menu.style.display = 'block';
        const rect = anchor.getBoundingClientRect();
        const width = menu.offsetWidth;
        const height = menu.offsetHeight;

        let top = rect.bottom + 8;
        if (top + height > window.innerHeight - 8) top = rect.top - height - 8;
        top = Math.max(8, Math.min(top, window.innerHeight - height - 8));

        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
        menu.style.display = '';
    }

    function showServiceMenu() {
        if (!dropdownElement) createServiceMenu();
        closeSubmenus();
        updateServiceMenu();
        positionMenu(dropdownElement, menuButton);
        dropdownElement.classList.add('show');
        menuButton?.classList.add('clicked');
        menuButton?.setAttribute('aria-expanded', 'true');
    }

    function closeServiceMenu() {
        dropdownElement?.classList.remove('show');
        closeSubmenus();
        menuButton?.classList.remove('clicked');
        menuButton?.setAttribute('aria-expanded', 'false');
    }

    function createServicePicker() {
        pickerElement = document.createElement('div');
        pickerElement.className = 'service-picker';

        const title = document.createElement('div');
        title.className = 'service-picker-title';
        title.textContent = 'Download via';
        pickerElement.appendChild(title);

        for (const group of SERVICE_GROUPS) {
            pickerElement.appendChild(createMenuItem({
                label: group.name,
                value: group.id,
                iconGroup: group,
                onClick: () => {
                    const track = pickerTrack;
                    const serviceKey = getGroupSelection(group);
                    closeServicePicker();
                    if (track) startDownload(track, serviceKey);
                }
            }));
        }

        document.body.appendChild(pickerElement);
    }

    function openServicePicker(button, track) {
        closeServiceMenu();
        pickerTrack = track;

        if (!pickerElement) createServicePicker();

        if (pickerButton && pickerButton !== button) {
            pickerButton.classList.remove('active');
            pickerButton.setAttribute('aria-expanded', 'false');
        }
        pickerButton = button;
        button.classList.add('active');
        button.setAttribute('aria-expanded', 'true');

        for (const item of pickerElement.querySelectorAll('.service-menu-item')) {
            const group = GROUPS_BY_ID.get(item.dataset.service);
            if (!group) continue;
            item.title = hasOptions(group)
                ? `${group.name} - ${getServiceLabel(getGroupSelection(group))}`
                : group.name;
        }

        positionMenu(pickerElement, button);
        pickerElement.classList.add('show');
    }

    function closeServicePicker() {
        pickerElement?.classList.remove('show');
        if (pickerButton) {
            pickerButton.classList.remove('active');
            pickerButton.setAttribute('aria-expanded', 'false');
        }
        pickerButton = null;
        pickerTrack = null;
    }

    function closeAllMenus() {
        closeServicePicker();
        closeServiceMenu();
    }

    function createDownloadButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'e-10810-legacy-button e-10810-legacy-button-tertiary e-10810-overflow-wrap-anywhere e-10810-button-tertiary--icon-only-small e-10810-button-tertiary--icon-only e-10810-button-tertiary--condensed e-10810-button-tertiary--text-subdued encore-internal-color-text-subdued download-btn';
        button.setAttribute('aria-label', 'Download');
        button.setAttribute('aria-haspopup', 'true');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('data-encore-id', 'buttonTertiary');
        button.tabIndex = -1;
        button.innerHTML = `<span aria-hidden="true" class="e-10810-button__icon-wrapper">${DOWNLOAD_ICON}</span>`;

        button.addEventListener('click', (event) => {
            event.stopPropagation();

            if (pickerButton === button && pickerElement?.classList.contains('show')) {
                closeServicePicker();
                return;
            }

            const trackRow = button.closest('[data-testid="tracklist-row"]');
            const track = trackRow && getTrackData(trackRow);
            if (track) openServicePicker(button, track);
        });

        return button;
    }

    function processTrackRow(trackRow) {
        const trackUrl = getTrackUrl(trackRow);
        let button = trackRow.querySelector('.download-btn');

        if (!trackUrl) {
            if (button && button === pickerButton) closeServicePicker();
            button?.remove();
            return;
        }

        if (!button) {
            const lastCell = trackRow.querySelector(':scope > [role="gridcell"]:last-child');
            if (!lastCell) return;

            button = createDownloadButton();
            lastCell.insertBefore(button, lastCell.firstChild);
        }

        if (button.dataset.trackHref === trackUrl) return;

        const info = getTrackInfo(trackRow);
        if (!info) {
            button.removeAttribute('title');
            button.setAttribute('aria-label', 'Download');
            return;
        }

        button.dataset.trackHref = trackUrl;
        const label = `Download ${getTrackLabel(info)}`;
        button.title = label;
        button.setAttribute('aria-label', label);
    }

    function checkTrackRows() {
        document.querySelectorAll('[data-testid="tracklist-row"]').forEach(processTrackRow);
    }

    function addServiceMenuToHeader() {
        const navBar = document.getElementById('global-nav-bar')
            || document.querySelector('[data-testid="global-nav-bar"]');
        if (!navBar) return;

        const existing = navBar.querySelector('.service-menu-button');
        if (existing && existing === menuButton) return;
        existing?.remove();

        const logoLink = navBar.querySelector('a[href="/"] svg[data-encore-id="logoSpotify"]')?.closest('a')
            || navBar.querySelector('a[href="/"]');
        if (!logoLink) return;

        if (menuButton) closeServiceMenu();

        menuButton = document.createElement('button');
        menuButton.type = 'button';
        menuButton.className = 'service-menu-button';
        menuButton.setAttribute('aria-label', 'Download Services');
        menuButton.setAttribute('aria-haspopup', 'true');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.innerHTML = GEAR_ICON;
        menuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            if (dropdownElement?.classList.contains('show')) {
                closeServiceMenu();
            } else {
                closeServicePicker();
                showServiceMenu();
            }
        });

        logoLink.insertAdjacentElement('afterend', menuButton);
    }

    const SCAN_RELEVANT = [
        '[data-testid="tracklist-row"]',
        '[data-testid="tracklist"]',
        '[role="grid"]',
        '[role="rowgroup"]',
        '#global-nav-bar',
        '[data-testid="global-nav-bar"]'
    ].join(', ');

    function affectsScanTarget(node) {
        return node.nodeType === 1
            && (node.matches(SCAN_RELEVANT) || node.querySelector(SCAN_RELEVANT));
    }

    function mutationsMatter(mutations) {
        for (const mutation of mutations) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                if (affectsScanTarget(mutation.addedNodes[i])) return true;
            }
            for (let i = 0; i < mutation.removedNodes.length; i++) {
                if (affectsScanTarget(mutation.removedNodes[i])) return true;
            }
        }
        return false;
    }

    function scan() {
        if (document.hidden) return;
        checkTrackRows();
        if (!menuButton?.isConnected) addServiceMenuToHeader();
    }

    let scanTimer = 0;
    function queueScan() {
        if (scanTimer) return;
        scanTimer = setTimeout(() => {
            scanTimer = 0;
            scan();
        }, 50);
    }

    scan();

    setInterval(scan, 1000);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) scan();
    });

    new MutationObserver((mutations) => {
        if (mutationsMatter(mutations)) queueScan();
    }).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;
        const target = event.target;

        if (pickerElement?.classList.contains('show')
            && !target.closest('.service-picker, .download-btn')) {
            closeServicePicker();
        }
        if (dropdownElement?.classList.contains('show')
            && !target.closest('.service-menu-button, .service-menu-dropdown')) {
            closeServiceMenu();
        }
    });

    document.addEventListener('scroll', () => {
        if (pickerElement?.classList.contains('show')) closeServicePicker();
    }, { capture: true, passive: true });

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            closeServicePicker();
            if (dropdownElement?.classList.contains('show')) {
                closeSubmenus();
                positionMenu(dropdownElement, menuButton);
            }
        }, 100);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAllMenus();
    });
})();
