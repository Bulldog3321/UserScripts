// ==UserScript==
// @name         Nyaa - Tag Blocking & Following
// @description  Hide or highlight releases on Nyaa based on tags.
// @author       Bulldog
// @version      1.0
// @icon         https://nyaa.si/static/favicon.png
// @namespace    https://github.com/Bulldog3321/UserScripts
// @homepageURL  https://github.com/Bulldog3321/UserScripts/tree/main/Nyaa%20-%20Tag%20Blocking%20&%20Following
// @downloadURL  https://bulldog3321.github.io/UserScripts/Nyaa%20-%20Tag%20Blocking%20&%20Following/nyaa-tag-blocking-following.user.js
// @supportURL   https://github.com/Bulldog3321/UserScripts/issues
// @match        https://*.nyaa.si/*
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const MAX_TAG_LENGTH = 50;
    const MAX_TAGS_COUNT = 1000;
    const MAX_RULES_COUNT = 500;
    const MAX_MESSAGE_LENGTH = 200;
    const NOTIFICATION_DURATION = 5000;
    const MAX_VISIBLE_NOTIFICATIONS = 5;
    const NOTIFICATION_TOP = 20;
    const NOTIFICATION_SPACING = 10;
    const DEFAULT_SORT = 'date_asc';
    const DEFAULT_HIGHLIGHT_COLOR = 'rgba(255, 255, 0, 0.2)';
    const DEFAULT_COLOR_PICKER = '#ffff00';
    const SORT_PREFS = ['date_asc', 'date_desc', 'alpha_asc', 'alpha_desc'];
    const STORAGE_PREFIX = 'nyaaTagBlocker:';
    const NOTIFICATION_TYPES = ['info', 'warning', 'error'];

    const isNonEmpty = value => typeof value === 'string' && value.trim().length > 0;
    const sanitizeText = value => {
        if (typeof value !== 'string') return '';
        return value.trim().replace(/[<>"']/g, '').substring(0, MAX_TAG_LENGTH);
    };
    const sanitizeStringList = (list, limit) => [...new Set((Array.isArray(list) ? list : [])
        .filter(isNonEmpty)
        .map(sanitizeText)
        .filter(isNonEmpty))]
        .slice(0, limit);
    const splitInput = value => sanitizeStringList(String(value || '').split(','), MAX_TAGS_COUNT);

    const initStyles = () => {
        if (document.getElementById('tag-blocker-styles')) return;

        const style = document.createElement('style');
        style.id = 'tag-blocker-styles';
        style.textContent = `
            :root {
                --tb-text: #e2e2e2;
                --tb-text-muted: rgba(204, 204, 204, 0.5);
                --tb-background-primary: #191919;
                --tb-background-secondary: #323232;
                --tb-separator: #646464;
                --tb-button-inactive-hover: #434343;
                --tb-button: #247fcc;
                --tb-button-hover: #1c64a1;
                --tb-warning: #f0ad4e;
                --tb-warning-hover: #ec971f;
                --tb-danger: #d9534f;
                --tb-danger-hover: #c9302c;
                --tb-spacing-xl: 20px;
                --tb-spacing-l: 10px;
                --tb-spacing-m: 8px;
                --tb-spacing-s: 4px;
                --tb-spacing-xs: 2px;
                --tb-radius: 4px;
                --tb-notification-duration: ${NOTIFICATION_DURATION}ms;
            }
            @keyframes tb-slide-in {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes tb-shrink-timer {
                from {
                    transform: scaleX(1);
                }
                to {
                    transform: scaleX(0);
                }
            }

            .tb-notification {
                position: fixed;
                top: 20px;
                right: var(--tb-spacing-xl);
                background: var(--tb-button);
                color: var(--tb-text);
                padding: calc(var(--tb-spacing-m) * 2);
                border-radius: var(--tb-radius);
                z-index: 10001;
                max-width: 350px;
                animation: tb-slide-in 0.3s ease-out;
                transition: top 0.3s ease-out, opacity 0.3s ease-out;
                overflow: hidden;
                word-break: break-word;
            }
            .tb-notification-warning {
                background: var(--tb-warning);
            }
            .tb-notification-error {
                background: var(--tb-danger);
            }
            .tb-notification-leaving {
                opacity: 0;
            }
            .tb-notification-timer {
                position: absolute;
                bottom: 0;
                left: 0;
                height: var(--tb-spacing-s);
                width: 100%;
                background: rgba(255, 255, 255, 0.8);
                transform-origin: left;
                transform: scaleX(1);
            }
            .tb-notification-timer-run {
                animation: tb-shrink-timer var(--tb-notification-duration) linear forwards;
            }

            .tb-gui {
                position: fixed;
                bottom: calc(var(--tb-spacing-l) + 55px);
                right: var(--tb-spacing-xl);
                background: var(--tb-background-primary);
                padding: var(--tb-spacing-m);
                z-index: 9999;
                display: none;
                color: var(--tb-text);
                border-radius: var(--tb-radius);
                width: 350px;
                max-height: 80vh;
                overflow-y: auto;
                font-family: inherit;
            }
            .tb-gui-open {
                display: block;
            }
            .tb-toggle-gui {
                position: fixed;
                bottom: var(--tb-spacing-xl);
                right: var(--tb-spacing-xl);
                background: var(--tb-button);
                border: none;
                color: var(--tb-text);
                padding: var(--tb-spacing-m) var(--tb-spacing-l);
                z-index: 10000;
                border-radius: var(--tb-radius);
                cursor: pointer;
                font-size: 12px;
                font-family: inherit;
            }
            .tb-toggle-gui:hover {
                background: var(--tb-button-hover);
            }

            .tb-tabs {
                display: flex;
                gap: var(--tb-spacing-s);
                margin-bottom: var(--tb-spacing-m);
            }
            .tb-tab {
                flex: 1;
                background: var(--tb-background-secondary);
                border: none;
                color: var(--tb-text);
                border-radius: var(--tb-radius) var(--tb-radius) 0 0;
                padding: var(--tb-spacing-m) var(--tb-spacing-l);
                cursor: pointer;
                font-size: 14px;
                font-family: inherit;
            }
            .tb-tab:hover {
                background: var(--tb-button-inactive-hover);
            }
            .tb-tab-active,
            .tb-tab-active:hover {
                background: var(--tb-button);
            }

            .tb-panel {
                display: none;
            }
            .tb-panel-active {
                display: block;
            }

            .tb-hr {
                border: none;
                border-top: 1px solid var(--tb-separator);
                margin: var(--tb-spacing-m) calc(var(--tb-spacing-m) * -1);
            }
            .tb-hr-first {
                margin-top: calc(var(--tb-spacing-m) * -1);
            }
            .tb-section {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--tb-spacing-s);
                margin-bottom: var(--tb-spacing-s);
            }
            .tb-section-title {
                font-size: 12px;
                color: var(--tb-text);
            }
            .tb-subhead {
                font-size: 12px;
                color: var(--tb-text);
                margin-bottom: var(--tb-spacing-s);
            }
            .tb-field {
                margin-bottom: var(--tb-spacing-m);
            }
            .tb-mt {
                margin-top: var(--tb-spacing-l);
            }
            .tb-row {
                display: flex;
                align-items: center;
                gap: var(--tb-spacing-s);
            }
            .tb-row-between {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: var(--tb-background-secondary);
                padding: var(--tb-spacing-m);
                border-radius: var(--tb-radius);
                margin-bottom: var(--tb-spacing-s);
            }
            .tb-label {
                display: block;
                font-size: 12px;
                color: var(--tb-text);
                margin-bottom: var(--tb-spacing-s);
            }

            .tb-list {
                padding: var(--tb-spacing-m);
                max-height: 120px;
                overflow-y: auto;
                display: flex;
                flex-wrap: wrap;
                gap: var(--tb-spacing-s);
                align-content: flex-start;
                background: var(--tb-background-secondary);
                border-radius: var(--tb-radius);
            }
            .tb-list-vertical {
                flex-direction: column;
                flex-wrap: nowrap;
                align-items: stretch;
            }
            .tb-empty {
                width: 100%;
                color: var(--tb-text-muted);
                text-align: center;
                font-size: 12px;
                padding: var(--tb-spacing-m);
            }
            .tb-item {
                cursor: pointer;
                background: var(--tb-button);
                color: var(--tb-text);
                padding: var(--tb-spacing-xs) var(--tb-spacing-s);
                border-radius: var(--tb-radius);
                font-size: 12px;
            }
            .tb-item:hover {
                text-decoration: line-through;
            }
            .tb-rule {
                display: flex;
                align-items: center;
                gap: var(--tb-spacing-s);
                width: 100%;
                box-sizing: border-box;
                background: var(--tb-background-secondary);
                border-radius: var(--tb-radius);
            }
            .tb-rule-body {
                flex-grow: 1;
                min-width: 0;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: var(--tb-spacing-s);
                flex-wrap: wrap;
            }
            .tb-rule-remove {
                margin-left: auto;
            }
            .tb-chip {
                background: var(--tb-button);
                color: var(--tb-text);
                padding: var(--tb-spacing-xs) var(--tb-spacing-s);
                border-radius: var(--tb-radius);
                font-size: 12px;
            }
            .tb-chip-exception {
                background: var(--tb-danger);
                cursor: help;
            }
            .tb-chip-condition {
                background: #2e8b57;
                cursor: help;
            }

            .tb-input {
                width: 100%;
                padding: var(--tb-spacing-m);
                background: var(--tb-background-secondary);
                border: none;
                color: var(--tb-text);
                border-radius: var(--tb-radius);
                outline: none;
                box-sizing: border-box;
                font-size: 12px;
                font-family: inherit;
            }
            .tb-select {
                width: 100%;
                padding: var(--tb-spacing-m);
                background: var(--tb-background-secondary);
                border: none;
                color: var(--tb-text);
                border-radius: var(--tb-radius);
                cursor: pointer;
                font-size: 12px;
                font-family: inherit;
            }
            .tb-checkbox {
                cursor: pointer;
                margin: 0;
            }
            .tb-color-picker {
                width: 50px;
                border: none;
                background: var(--tb-background-primary);
                border-radius: var(--tb-radius);
                cursor: pointer;
            }
            .tb-color-text {
                flex: 1;
                font-size: 12px;
                color: var(--tb-text);
            }
            .tb-actions {
                display: flex;
                gap: var(--tb-spacing-s);
            }
            .tb-btn {
                background: var(--tb-button);
                border: none;
                color: var(--tb-text);
                border-radius: var(--tb-radius);
                padding: var(--tb-spacing-m) var(--tb-spacing-l);
                cursor: pointer;
                font-size: 12px;
                font-family: inherit;
                white-space: nowrap;
            }
            .tb-btn:hover {
                background: var(--tb-button-hover);
            }
            .tb-btn-flex {
                flex: 1;
            }
            .tb-btn-block {
                width: 100%;
                margin-top: var(--tb-spacing-s);
            }
            .tb-btn-small {
                padding: var(--tb-spacing-xs) var(--tb-spacing-s);
            }
            .tb-btn-danger {
                background: var(--tb-danger);
            }
            .tb-btn-danger:hover {
                background: var(--tb-danger-hover);
            }
            .tb-btn-warning {
                background: var(--tb-warning);
            }
            .tb-btn-warning:hover {
                background: var(--tb-warning-hover);
            }

            .tag-header {
                text-align: center;
                max-width: 150px;
            }
            .tag-cell {
                text-align: center;
                max-width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .tb-tag-text {
                cursor: pointer;
            }
            .tb-tag-text:hover {
                text-decoration: line-through;
            }
            .tb-clickable-tag {
                cursor: pointer;
            }
            .tb-clickable-tag:hover {
                text-decoration: line-through;
            }
        `;
        document.head.appendChild(style);
    };

    const notifications = {
        queue: [],
        visible: 0,

        add(message, type) {
            this.queue.push({ message, type });
            this.process();
        },

        process() {
            while (this.visible < MAX_VISIBLE_NOTIFICATIONS && this.queue.length > 0) {
                const { message, type } = this.queue.shift();
                this.visible++;
                this.show(message, type);
            }
        },

        restack() {
            let top = NOTIFICATION_TOP;
            document.querySelectorAll('.tb-notification').forEach(el => {
                el.style.top = `${top}px`;
                top += el.offsetHeight + NOTIFICATION_SPACING;
            });
        },

        show(message, type) {
            const safeType = NOTIFICATION_TYPES.includes(type) ? type : 'info';

            const el = document.createElement('div');
            el.className = `tb-notification tb-notification-${safeType}`;

            const text = document.createElement('div');
            text.textContent = message.substring(0, MAX_MESSAGE_LENGTH);

            const timerBar = document.createElement('div');
            timerBar.className = 'tb-notification-timer';

            el.appendChild(text);
            el.appendChild(timerBar);
            document.body.appendChild(el);
            this.restack();

            let timeoutId = null;
            let paused = false;

            const dismiss = () => {
                el.classList.add('tb-notification-leaving');
                setTimeout(() => {
                    el.remove();
                    this.visible--;
                    this.restack();
                    this.process();
                }, 300);
            };

            const startTimer = () => {
                timerBar.classList.remove('tb-notification-timer-run');
                void timerBar.offsetWidth;
                timerBar.classList.add('tb-notification-timer-run');

                clearTimeout(timeoutId);
                timeoutId = setTimeout(dismiss, NOTIFICATION_DURATION);
            };

            el.addEventListener('mouseenter', () => {
                if (paused) return;
                paused = true;
                clearTimeout(timeoutId);
                timerBar.classList.remove('tb-notification-timer-run');
                timerBar.style.transform = 'scaleX(1)';
            });

            el.addEventListener('mouseleave', () => {
                if (!paused) return;
                paused = false;
                timerBar.style.transform = '';
                startTimer();
            });

            startTimer();
        }
    };

    const showNotification = (message, type = 'info') => {
        try {
            if (!isNonEmpty(message)) {
                console.warn('Attempted to show an empty notification');
                return;
            }
            notifications.add(message, type);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    };

    const storageKey = key => STORAGE_PREFIX + key;

    const readJson = (key, fallback, revive) => {
        let raw;
        try {
            raw = localStorage.getItem(storageKey(key));
        } catch (error) {
            console.error(`Storage read failed for "${key}":`, error);
            return fallback;
        }
        if (raw === null) return fallback;

        try {
            const parsed = JSON.parse(raw);
            return revive ? revive(parsed) : parsed;
        } catch (error) {
            console.error(`Storage parse failed for "${key}":`, error);
            showNotification(`Storage error: could not read ${key}`, 'error');
            return fallback;
        }
    };

    const writeJson = (key, value) => {
        try {
            localStorage.setItem(storageKey(key), JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Storage write failed for "${key}":`, error);
            showNotification(`Storage error: could not save ${key}`, 'error');
            return false;
        }
    };

    const COLOR_RE = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;

    const sanitizeRule = rule => ({
        contains: sanitizeText(rule.contains),
        notContains: sanitizeText(rule.notContains),
        onlyIfContains: sanitizeText(rule.onlyIfContains)
    });

    const isValidRule = rule => rule !== null && typeof rule === 'object' &&
        typeof rule.contains === 'string' && typeof rule.notContains === 'string' &&
        typeof rule.onlyIfContains === 'string' && isNonEmpty(rule.contains);

    const ruleKey = rule => JSON.stringify([rule.contains, rule.notContains, rule.onlyIfContains].map(part => part.toLowerCase()));

    const createTagListStore = key => ({
        get: () => readJson(key, [], parsed => {
            if (!Array.isArray(parsed)) throw new Error('Invalid data format');
            return sanitizeStringList(parsed, MAX_TAGS_COUNT);
        }),
        save: list => {
            try {
                if (!Array.isArray(list)) throw new Error('Expected an array');
                if (list.length > MAX_TAGS_COUNT) throw new Error(`Maximum ${MAX_TAGS_COUNT} tags allowed`);
                return writeJson(key, sanitizeStringList(list, MAX_TAGS_COUNT));
            } catch (error) {
                console.error(`Storage save failed for "${key}":`, error);
                showNotification(`Storage error: could not save ${key}`, 'error');
                return false;
            }
        }
    });

    const blockedTagsStore = createTagListStore('blockedTags');
    const followedTagsStore = createTagListStore('followedTags');

    const getBlockedTags = () => blockedTagsStore.get();
    const saveBlockedTags = tags => blockedTagsStore.save(tags);
    const getFollowedTags = () => followedTagsStore.get();
    const saveFollowedTags = tags => followedTagsStore.save(tags);

    const getAdvancedRules = () => readJson('advancedRules', [], parsed => {
        if (!Array.isArray(parsed)) throw new Error('Invalid data format');
        return parsed.filter(isValidRule).map(sanitizeRule).slice(0, MAX_RULES_COUNT);
    });

    const saveAdvancedRules = rules => {
        try {
            if (!Array.isArray(rules)) throw new Error('Rules must be an array');
            if (rules.length > MAX_RULES_COUNT) throw new Error(`Maximum ${MAX_RULES_COUNT} rules allowed`);
            return writeJson('advancedRules', rules.filter(isValidRule).map(sanitizeRule));
        } catch (error) {
            console.error('Storage save failed for "advancedRules":', error);
            showNotification('Storage error: could not save advancedRules', 'error');
            return false;
        }
    };

    const getSortPreference = () => readJson('sortPreference', DEFAULT_SORT,
        pref => SORT_PREFS.includes(pref) ? pref : DEFAULT_SORT);

    const saveSortPreference = pref => {
        if (!SORT_PREFS.includes(pref)) {
            console.error(`Invalid sort preference: ${pref}`);
            return false;
        }
        return writeJson('sortPreference', pref);
    };

    const readBoolean = (key, fallback) => readJson(key, fallback, parsed => parsed === true || parsed === false ? parsed : fallback);

    const getTagVisibility = () => readBoolean('tagVisibility', true);
    const saveTagVisibility = value => typeof value === 'boolean' ? writeJson('tagVisibility', value) : false;

    const getClickToBlock = () => readBoolean('clickToBlock', true);
    const saveClickToBlock = value => typeof value === 'boolean' ? writeJson('clickToBlock', value) : false;

    const getHighlightColor = () => readJson('highlightColor', DEFAULT_HIGHLIGHT_COLOR,
        color => typeof color === 'string' && COLOR_RE.test(color) ? color : DEFAULT_HIGHLIGHT_COLOR);

    const saveHighlightColor = color => {
        if (typeof color !== 'string' || !COLOR_RE.test(color.trim())) {
            console.error(`Invalid highlight color: ${color}`);
            return false;
        }
        return writeJson('highlightColor', color.trim());
    };

    const getReleaseName = row => {
        try {
            if (!row || typeof row.querySelectorAll !== 'function') return '';
            for (const link of row.querySelectorAll('a')) {
                const text = link.textContent ? link.textContent.trim() : '';
                if (text && !link.querySelector('i')) return text;
            }
            return '';
        } catch (error) {
            console.error('Error getting release name:', error);
            return '';
        }
    };

    const extractTag = name => {
        try {
            if (typeof name !== 'string') return '';
            const match = name.match(/\[([^\]]+)\]/);
            return match && match[1] ? match[1] : '';
        } catch (error) {
            console.error('Error extracting tag:', error);
            return '';
        }
    };

    const containsFold = (haystack, needle) => haystack.includes(needle.toLowerCase());

    const ruleMatches = (rule, nameLower) => {
        if (!containsFold(nameLower, rule.contains)) return false;
        if (isNonEmpty(rule.notContains) && containsFold(nameLower, rule.notContains)) return false;
        if (isNonEmpty(rule.onlyIfContains) && !containsFold(nameLower, rule.onlyIfContains)) return false;
        return true;
    };

    const blockRelease = (name, blockedTags, rules) => {
        if (!isNonEmpty(name)) return false;
        const nameLower = name.toLowerCase();
        return blockedTags.some(tag => containsFold(nameLower, tag)) ||
            rules.some(rule => ruleMatches(rule, nameLower));
    };

    const isFollowedName = (name, followedTags) => {
        if (!isNonEmpty(name)) return false;
        const nameLower = name.toLowerCase();
        return followedTags.some(tag => containsFold(nameLower, tag));
    };

    const getList = isBlocking => isBlocking ? getBlockedTags() : getFollowedTags();
    const saveList = (isBlocking, list) => isBlocking ? saveBlockedTags(list) : saveFollowedTags(list);
    const refreshList = isBlocking => isBlocking ? refreshTagList() : refreshFollowedTagsList();
    const refreshReleases = isBlocking => isBlocking ? hideBlockedReleases() : highlightFollowedReleases();

    const addTags = (input, isBlocking = true) => {
        try {
            const newTags = splitInput(input);
            const label = isBlocking ? 'blocked' : 'following';

            if (newTags.length === 0) {
                showNotification('No valid tags to add', 'warning');
                return;
            }

            const currentTags = getList(isBlocking);
            const currentSet = new Set(currentTags);
            const tagsToAdd = newTags.filter(tag => !currentSet.has(tag));
            const alreadyAdded = newTags.filter(tag => currentSet.has(tag));

            if (currentTags.length + tagsToAdd.length > MAX_TAGS_COUNT) {
                showNotification(`Cannot exceed ${MAX_TAGS_COUNT} total tags`, 'error');
                return;
            }

            if (tagsToAdd.length === 0) {
                showNotification(`Already ${label}: ${alreadyAdded.join(', ')}`, 'warning');
                return;
            }

            if (saveList(isBlocking, [...currentTags, ...tagsToAdd])) {
                refreshList(isBlocking);
                refreshReleases(isBlocking);

                let message = `${isBlocking ? 'Blocked' : 'Following'}: ${tagsToAdd.join(', ')}`;
                if (alreadyAdded.length > 0) message += ` (Already ${label}: ${alreadyAdded.join(', ')})`;
                showNotification(message, 'info');
            }
        } catch (error) {
            console.error('Error adding tag:', error);
            showNotification('Failed to add tag', 'error');
        }
    };

    const removeTag = (tag, isBlocking = true) => {
        try {
            if (!isNonEmpty(tag)) {
                showNotification('Invalid tag', 'error');
                return;
            }

            const currentTags = getList(isBlocking);
            const updatedTags = currentTags.filter(t => t !== tag);

            if (updatedTags.length === currentTags.length) {
                showNotification(`Tag not found: ${tag}`, 'warning');
                return;
            }

            if (saveList(isBlocking, updatedTags)) {
                refreshList(isBlocking);
                refreshReleases(isBlocking);
                showNotification(`${isBlocking ? 'Unblocked' : 'Unfollowed'}: ${tag}`, 'info');
            }
        } catch (error) {
            console.error('Error removing tag:', error);
            showNotification('Failed to remove tag', 'error');
        }
    };

    const blockTagFromTable = tag => {
        try {
            const sanitized = sanitizeText(tag);
            if (!isNonEmpty(sanitized)) {
                showNotification('Invalid tag', 'error');
                return;
            }

            const blockedTags = getBlockedTags();

            if (blockedTags.includes(sanitized)) {
                showNotification(`Already blocked: ${sanitized}`, 'warning');
                return;
            }
            if (blockedTags.length >= MAX_TAGS_COUNT) {
                showNotification(`Maximum ${MAX_TAGS_COUNT} tags reached`, 'error');
                return;
            }

            if (saveBlockedTags([...blockedTags, sanitized])) {
                refreshTagList();
                hideBlockedReleases();
                showNotification(`Blocked: ${sanitized}`, 'info');
            }
        } catch (error) {
            console.error('Error blocking tag from table:', error);
            showNotification('Failed to block tag', 'error');
        }
    };

    const deleteAllTags = () => {
        try {
            const blockedTags = getBlockedTags();
            const rules = getAdvancedRules();
            const followedTags = getFollowedTags();

            const message = `Are you sure you want to RESET EVERYTHING?\n\nThis will:\n- Delete ${blockedTags.length} blocked tag(s)\n- Delete ${rules.length} rule(s)\n- Delete ${followedTags.length} followed tag(s)\n- Reset all settings to default\n\nWarning: This action cannot be undone.`;

            if (!confirm(message)) return;

            saveBlockedTags([]);
            saveAdvancedRules([]);
            saveFollowedTags([]);
            saveSortPreference(DEFAULT_SORT);
            saveTagVisibility(true);
            saveHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
            saveClickToBlock(true);

            refreshTagList();
            refreshAdvancedRulesList();
            refreshFollowedTagsList();
            hideBlockedReleases();
            highlightFollowedReleases();
            updateTable();

            document.getElementById('sort-preference').value = DEFAULT_SORT;
            document.getElementById('toggle-tag-visibility').checked = true;
            document.getElementById('toggle-click-to-block').checked = true;
            document.getElementById('highlight-color-picker').value = DEFAULT_COLOR_PICKER;

            showNotification('All settings reset to defaults', 'info');
        } catch (error) {
            console.error('Error resetting all settings:', error);
            showNotification('Failed to reset settings', 'error');
        }
    };

    const deleteAllByType = type => {
        try {
            const typeMap = {
                blocked: { get: getBlockedTags, save: saveBlockedTags, name: 'blocked tags', refresh: refreshTagList, update: hideBlockedReleases },
                followed: { get: getFollowedTags, save: saveFollowedTags, name: 'followed tags', refresh: refreshFollowedTagsList, update: highlightFollowedReleases },
                rules: { get: getAdvancedRules, save: saveAdvancedRules, name: 'rules', refresh: refreshAdvancedRulesList, update: hideBlockedReleases }
            };

            const config = typeMap[type];
            if (!config) return;

            const items = config.get();
            if (items.length === 0) {
                showNotification(`No ${config.name} to delete`, 'warning');
                return;
            }

            if (!confirm(`Are you sure you want to delete ${items.length} ${config.name}?\n\nWarning: This action cannot be undone.`)) return;

            if (config.save([])) {
                config.refresh();
                config.update();
                showNotification(`Deleted all ${config.name}`, 'info');
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            showNotification(`Failed to delete ${type}`, 'error');
        }
    };

    const addAdvancedRule = () => {
        try {
            const containsInput = document.getElementById('advanced-contains');
            const notContainsInput = document.getElementById('advanced-not-contains');
            const onlyIfInput = document.getElementById('advanced-only-if');

            if (!containsInput || !notContainsInput || !onlyIfInput) {
                showNotification('Input fields not found', 'error');
                return;
            }

            const contains = containsInput.value;
            const notContainsList = splitInput(notContainsInput.value);
            const onlyIfContainsList = splitInput(onlyIfInput.value);
            const containsTags = splitInput(contains);

            if (containsTags.length === 0) {
                showNotification('Must specify what to block', 'warning');
                return;
            }

            if (notContainsList.length === 0 && onlyIfContainsList.length === 0) {
                addTags(contains, true);
                containsInput.value = '';
                return;
            }

            const candidates = [];
            if (containsTags.length === 1) {
                const tag = containsTags[0];
                const maxConditions = Math.max(notContainsList.length || 1, onlyIfContainsList.length || 1);

                for (let i = 0; i < maxConditions; i++) {
                    candidates.push({
                        contains: tag,
                        notContains: notContainsList[i] || '',
                        onlyIfContains: onlyIfContainsList[i] || ''
                    });
                }
            } else {
                for (const tag of containsTags) {
                    candidates.push({
                        contains: tag,
                        notContains: notContainsList[0] || '',
                        onlyIfContains: onlyIfContainsList[0] || ''
                    });
                }
            }

            const rules = getAdvancedRules();
            const existingKeys = new Set(rules.map(ruleKey));
            const rulesToAdd = [];
            const duplicates = [];

            for (const rule of candidates) {
                if (existingKeys.has(ruleKey(rule))) duplicates.push(rule);
                else rulesToAdd.push(rule);
            }

            if (rules.length + rulesToAdd.length > MAX_RULES_COUNT) {
                showNotification(`Cannot exceed ${MAX_RULES_COUNT} rules`, 'error');
                return;
            }

            if (rulesToAdd.length === 0) {
                showNotification(`All rules already exist (${duplicates.length} duplicate(s))`, 'warning');
                return;
            }

            if (saveAdvancedRules([...rules, ...rulesToAdd])) {
                refreshAdvancedRulesList();
                hideBlockedReleases();

                let message = `Added ${rulesToAdd.length} rule(s)`;
                if (duplicates.length > 0) message += ` (${duplicates.length} duplicate(s) skipped)`;
                showNotification(message, 'info');

                containsInput.value = '';
                notContainsInput.value = '';
                onlyIfInput.value = '';
            }
        } catch (error) {
            console.error('Error adding advanced rule:', error);
            showNotification('Failed to add rule', 'error');
        }
    };

    const removeAdvancedRule = rule => {
        try {
            if (!isValidRule(rule)) {
                showNotification('Invalid rule', 'error');
                return;
            }

            const rules = getAdvancedRules();
            const targetKey = ruleKey(rule);
            const index = rules.findIndex(r => ruleKey(r) === targetKey);

            if (index === -1) {
                showNotification('Rule not found', 'error');
                return;
            }

            const [removed] = rules.splice(index, 1);

            if (saveAdvancedRules(rules)) {
                refreshAdvancedRulesList();
                hideBlockedReleases();

                let description = `"${removed.contains}"`;
                if (isNonEmpty(removed.notContains)) description += ` (except "${removed.notContains}")`;
                if (isNonEmpty(removed.onlyIfContains)) description += ` (only if "${removed.onlyIfContains}")`;
                showNotification(`Removed rule: ${description}`, 'info');
            }
        } catch (error) {
            console.error('Error removing advanced rule:', error);
            showNotification('Failed to remove rule', 'error');
        }
    };

    const exportData = () => {
        try {
            const tags = getBlockedTags();
            const rules = getAdvancedRules();
            const followedTags = getFollowedTags();

            if (tags.length === 0 && rules.length === 0 && followedTags.length === 0) {
                showNotification('No tags or rules to export', 'warning');
                return;
            }

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `nyaa-blocker-export_${dateStr}_${timeStr}.json`;

            const exportObj = { version: '1.0', tags, rules, followedTags };
            const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                URL.revokeObjectURL(url);
                a.remove();
            }, 100);

            showNotification(`Exported ${tags.length} tag(s), ${rules.length} rule(s), ${followedTags.length} followed tag(s)`, 'info');
        } catch (error) {
            console.error('Error exporting data:', error);
            showNotification('Failed to export data', 'error');
        }
    };

    const processImport = json => {
        const data = JSON.parse(json);

        if (!data || typeof data !== 'object' || !data.version) {
            showNotification('Invalid file format', 'error');
            return;
        }

        let tagsAdded = 0;
        let rulesAdded = 0;
        let followedAdded = 0;
        let limitReached = false;

        if (Array.isArray(data.tags)) {
            const current = getBlockedTags();
            const merged = [...new Set([...current, ...sanitizeStringList(data.tags, MAX_TAGS_COUNT)])];
            if (merged.length > MAX_TAGS_COUNT) {
                limitReached = true;
            } else {
                tagsAdded = merged.length - current.length;
                saveBlockedTags(merged);
            }
        }

        if (Array.isArray(data.rules)) {
            const current = getAdvancedRules();
            const merged = [...current];
            const keys = new Set(current.map(ruleKey));

            for (const raw of data.rules) {
                if (merged.length >= MAX_RULES_COUNT) { limitReached = true; break; }
                if (!isValidRule(raw)) continue;
                const rule = sanitizeRule(raw);
                const key = ruleKey(rule);
                if (keys.has(key)) continue;
                keys.add(key);
                merged.push(rule);
                rulesAdded++;
            }

            saveAdvancedRules(merged);
        }

        if (Array.isArray(data.followedTags)) {
            const current = getFollowedTags();
            const merged = [...new Set([...current, ...sanitizeStringList(data.followedTags, MAX_TAGS_COUNT)])];
            if (merged.length > MAX_TAGS_COUNT) {
                limitReached = true;
            } else {
                followedAdded = merged.length - current.length;
                saveFollowedTags(merged);
            }
        }

        refreshTagList();
        refreshAdvancedRulesList();
        refreshFollowedTagsList();
        hideBlockedReleases();
        highlightFollowedReleases();

        if (tagsAdded + rulesAdded + followedAdded > 0) {
            showNotification(`Imported ${tagsAdded} tag(s), ${rulesAdded} rule(s), ${followedAdded} followed tag(s)`, 'info');
        } else {
            showNotification('No new items to import', 'warning');
        }

        if (limitReached) {
            showNotification('Some items were skipped because a limit was reached', 'warning');
        }
    };

    const importData = () => {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';

            input.onchange = event => {
                try {
                    const file = event.target.files && event.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = e => {
                        try {
                            processImport(String(e.target.result || ''));
                        } catch (error) {
                            console.error('Error parsing JSON:', error);
                            showNotification('Failed to parse JSON file', 'error');
                        }
                    };
                    reader.onerror = () => showNotification('Failed to read file', 'error');
                    reader.readAsText(file);
                } catch (error) {
                    console.error('Error handling file:', error);
                    showNotification('Failed to import data', 'error');
                }
            };

            input.click();
        } catch (error) {
            console.error('Error importing data:', error);
            showNotification('Failed to import data', 'error');
        }
    };

    const sortByPreference = (list, compare) => {
        const pref = getSortPreference();
        const sorted = [...list];
        if (pref.includes('alpha')) sorted.sort(compare);
        if (pref.includes('desc')) sorted.reverse();
        return sorted;
    };

    const emptyMessage = text => {
        const div = document.createElement('div');
        div.className = 'tb-empty';
        div.textContent = text;
        return div;
    };

    const renderTagChips = (containerId, tags, emptyText, onRemove, removeTitle) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.textContent = '';

        if (tags.length === 0) {
            container.appendChild(emptyMessage(emptyText));
            return;
        }

        for (const tag of sortByPreference(tags, (a, b) => a.localeCompare(b))) {
            const chip = document.createElement('span');
            chip.className = 'tb-item';
            chip.textContent = tag;
            chip.title = removeTitle;
            chip.onclick = () => onRemove(tag);
            container.appendChild(chip);
        }
    };

    const refreshTagList = () => {
        try {
            renderTagChips('blocked-tags', getBlockedTags(), 'No blocked tags', tag => removeTag(tag, true), 'Unblock this tag');
        } catch (error) {
            console.error('Error refreshing tag list:', error);
            showNotification('Failed to refresh tag list', 'error');
        }
    };

    const refreshFollowedTagsList = () => {
        try {
            renderTagChips('followed-tags', getFollowedTags(), 'No followed tags', tag => removeTag(tag, false), 'Unfollow this tag');
        } catch (error) {
            console.error('Error refreshing followed tags list:', error);
            showNotification('Failed to refresh followed tags list', 'error');
        }
    };

    const buildRuleElement = rule => {
        const row = document.createElement('div');
        row.className = 'tb-rule';

        const body = document.createElement('div');
        body.className = 'tb-rule-body';

        const chip = (text, className, title) => {
            const el = document.createElement('span');
            el.className = className;
            el.textContent = text;
            el.title = title;
            return el;
        };

        body.appendChild(chip(rule.contains, 'tb-chip', 'Block if contains'));
        if (isNonEmpty(rule.notContains)) body.appendChild(chip(rule.notContains, 'tb-chip tb-chip-exception', 'Not if'));
        if (isNonEmpty(rule.onlyIfContains)) body.appendChild(chip(rule.onlyIfContains, 'tb-chip tb-chip-condition', 'Only if'));

        const removeButton = document.createElement('button');
        removeButton.className = 'tb-btn tb-btn-danger tb-btn-small tb-rule-remove';
        removeButton.textContent = 'Remove';
        removeButton.title = 'Remove this rule';
        removeButton.onclick = () => removeAdvancedRule(rule);

        row.appendChild(body);
        row.appendChild(removeButton);
        return row;
    };

    const refreshAdvancedRulesList = () => {
        try {
            const container = document.getElementById('advanced-rules-list');
            if (!container) return;

            const rules = getAdvancedRules();
            container.textContent = '';

            if (rules.length === 0) {
                container.appendChild(emptyMessage('No advanced rules'));
                return;
            }

            for (const rule of sortByPreference(rules, (a, b) => a.contains.localeCompare(b.contains))) {
                container.appendChild(buildRuleElement(rule));
            }
        } catch (error) {
            console.error('Error refreshing advanced rules list:', error);
            showNotification('Failed to refresh rules list', 'error');
        }
    };

    const highlightFollowedReleases = () => {
        try {
            const followedTags = getFollowedTags();
            const highlightColor = getHighlightColor();

            document.querySelectorAll('.torrent-list tbody tr').forEach(row => {
                try {
                    const releaseName = getReleaseName(row);
                    if (!releaseName) return;

                    const followed = isFollowedName(releaseName, followedTags);
                    row.querySelectorAll('td').forEach(td => {
                        if (followed) td.style.setProperty('background-color', highlightColor, 'important');
                        else td.style.removeProperty('background-color');
                    });
                } catch (error) {
                    console.error('Error processing row:', error);
                }
            });
        } catch (error) {
            console.error('Error highlighting followed releases:', error);
            showNotification('Failed to highlight followed releases', 'error');
        }
    };

    const goToNextPageIfPossible = () => {
        const nextLink = document.querySelector('.pagination a[rel="next"][href]') ||
            document.querySelector('.pagination li.active + li a[href]');
        if (!nextLink) return;

        try {
            window.location.href = new URL(nextLink.getAttribute('href'), window.location.href).href;
        } catch (error) {
            console.error('Error navigating to next page:', error);
        }
    };

    const hideBlockedReleases = () => {
        try {
            const blockedTags = getBlockedTags();
            const rules = getAdvancedRules();
            const rows = document.querySelectorAll('.torrent-list tbody tr');

            if (rows.length === 0) return;

            let visibleRows = 0;
            rows.forEach(row => {
                try {
                    const releaseName = getReleaseName(row);
                    const blocked = releaseName ? blockRelease(releaseName, blockedTags, rules) : false;
                    row.style.display = blocked ? 'none' : '';
                    if (!blocked) visibleRows++;
                } catch (error) {
                    console.error('Error processing row:', error);
                }
            });

            if (visibleRows === 0) goToNextPageIfPossible();
        } catch (error) {
            console.error('Error hiding blocked releases:', error);
            showNotification('Failed to filter releases', 'error');
        }
    };

    const syncTagColumn = () => {
        const visible = getTagVisibility();

        if (!visible) {
            document.querySelectorAll('.tag-header, .tag-cell').forEach(el => el.remove());
            return;
        }

        const thead = document.querySelector('.torrent-list thead tr');
        if (thead && !thead.querySelector('.tag-header')) {
            const th = document.createElement('th');
            th.className = 'tag-header';
            th.textContent = 'Tag';
            thead.appendChild(th);
        }

        document.querySelectorAll('.torrent-list tbody tr').forEach(row => {
            try {
                if (row.querySelector('.tag-cell')) return;

                const releaseName = getReleaseName(row);
                if (!releaseName) return;

                const cell = document.createElement('td');
                cell.className = 'tag-cell';

                const detectedTag = extractTag(releaseName);
                if (detectedTag) {
                    const span = document.createElement('span');
                    span.className = 'tb-tag-text';
                    span.textContent = `[${detectedTag}]`;
                    span.title = 'Block this tag';
                    span.onclick = () => blockTagFromTable(`[${detectedTag}]`);
                    cell.appendChild(span);
                }

                row.appendChild(cell);
            } catch (error) {
                console.error('Error processing table row:', error);
            }
        });
    };

    const unwrapClickableTags = () => {
        document.querySelectorAll('.tb-clickable-tag').forEach(span => {
            const parent = span.parentNode;
            if (!parent) return;
            span.replaceWith(document.createTextNode(span.textContent));
            parent.normalize();
        });
    };

    const wrapClickableTags = () => {
        document.querySelectorAll('.torrent-list tbody tr').forEach(row => {
            try {
                row.querySelectorAll('td:not(.tag-cell) a').forEach(link => {
                    try {
                        const text = link.textContent ? link.textContent.trim() : '';
                        if (!text || link.querySelector('i')) return;
                        if (link.querySelector('.tb-clickable-tag')) return;

                        const tag = extractTag(text);
                        if (!tag) return;

                        const tagPattern = `[${tag}]`;
                        const tagIndex = text.indexOf(tagPattern);
                        if (tagIndex === -1) return;

                        const before = text.substring(0, tagIndex);
                        const after = text.substring(tagIndex + tagPattern.length);

                        link.textContent = '';
                        if (before) link.appendChild(document.createTextNode(before));

                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'tb-clickable-tag';
                        tagSpan.textContent = tagPattern;
                        tagSpan.title = 'Click to block this tag';
                        tagSpan.onclick = e => {
                            e.preventDefault();
                            e.stopPropagation();
                            blockTagFromTable(tagPattern);
                        };

                        link.appendChild(tagSpan);
                        if (after) link.appendChild(document.createTextNode(after));
                    } catch (error) {
                        console.error('Error adding click-to-block:', error);
                    }
                });
            } catch (error) {
                console.error('Error processing row:', error);
            }
        });
    };

    const updateTable = () => {
        try {
            syncTagColumn();

            if (getClickToBlock()) wrapClickableTags();
            else unwrapClickableTags();

            highlightFollowedReleases();
        } catch (error) {
            console.error('Error updating table:', error);
            showNotification('Failed to update table', 'error');
        }
    };

    // GUI
    const switchTab = tabName => {
        try {
            document.querySelectorAll('.tb-panel').forEach(panel => {
                panel.classList.toggle('tb-panel-active', panel.id === `tab-${tabName}`);
            });
            document.querySelectorAll('.tb-tab').forEach(btn => {
                btn.classList.toggle('tb-tab-active', btn.dataset.tab === tabName);
            });
        } catch (error) {
            console.error('Error switching tab:', error);
        }
    };

    const toPickerHex = value => {
        if (!value) return DEFAULT_COLOR_PICKER;
        const v = String(value).trim();
        if (v.startsWith('#')) {
            if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map(c => c + c).join('').toLowerCase();
            if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
            return DEFAULT_COLOR_PICKER;
        }
        const m = v.match(/(\d{1,3})\D+(\d{1,3})\D+(\d{1,3})/);
        if (!m) return DEFAULT_COLOR_PICKER;
        return '#' + [m[1], m[2], m[3]]
            .map(n => Math.min(255, Math.max(0, parseInt(n, 10) || 0)).toString(16).padStart(2, '0'))
            .join('');
    };

    const addGui = () => {
        try {
            const guiHtml = `
                <div id="tag-blocker-gui" class="tb-gui">
                    <div class="tb-tabs">
                        <button class="tb-tab tb-tab-active" data-tab="blocking">Blocking</button>
                        <button class="tb-tab" data-tab="following">Following</button>
                        <button class="tb-tab" data-tab="settings">Settings</button>
                    </div>

                    <hr class="tb-hr tb-hr-first">

                    <div id="tab-blocking" class="tb-panel tb-panel-active">
                        <div class="tb-section">
                            <div class="tb-section-title">Blocked Tags</div>
                            <button id="delete-all-blocked-tags" class="tb-btn tb-btn-danger tb-btn-small" title="Delete all blocked tags">Reset</button>
                        </div>
                        <div id="blocked-tags" class="tb-list"></div>

                        <div class="tb-section tb-mt">
                            <div class="tb-section-title">Tag Rules</div>
                            <button id="delete-all-rules" class="tb-btn tb-btn-danger tb-btn-small" title="Delete all tag rules">Reset</button>
                        </div>
                        <div id="advanced-rules-list" class="tb-list tb-list-vertical"></div>

                        <hr class="tb-hr">

                        <div class="tb-field">
                            <label class="tb-label" for="advanced-contains">Rule - Block if contains:</label>
                            <input type="text" id="advanced-contains" class="tb-input" maxlength="50" placeholder="e.g., [SubsPlease], -VARYG"/>
                        </div>
                        <div class="tb-field">
                            <label class="tb-label" for="advanced-not-contains">Exception (optional) - Not if contains:</label>
                            <input type="text" id="advanced-not-contains" class="tb-input" maxlength="50" placeholder="e.g., 1080p, WEB"/>
                        </div>
                        <div class="tb-field">
                            <label class="tb-label" for="advanced-only-if">Condition (optional) - Only if contains:</label>
                            <input type="text" id="advanced-only-if" class="tb-input" maxlength="50" placeholder="e.g., Batch, CR"/>
                        </div>
                        <button id="add-advanced-rule" class="tb-btn tb-btn-block">Add Tag or Rule</button>
                    </div>

                    <div id="tab-following" class="tb-panel">
                        <div class="tb-section">
                            <div class="tb-section-title">Followed Tags</div>
                            <button id="delete-all-followed-tags" class="tb-btn tb-btn-danger tb-btn-small" title="Delete all followed tags">Reset</button>
                        </div>
                        <div id="followed-tags" class="tb-list"></div>

                        <hr class="tb-hr">

                        <div class="tb-field">
                            <label class="tb-label" for="follow-tag-input">Highlight if contains:</label>
                            <input type="text" id="follow-tag-input" class="tb-input" maxlength="50" placeholder="e.g., [SubsPlease], -VARYG"/>
                        </div>
                        <button id="add-follow-tag" class="tb-btn tb-btn-block">Add Tag</button>
                    </div>

                    <div id="tab-settings" class="tb-panel">
                        <div class="tb-field">
                            <label class="tb-label" for="sort-preference">Sort Preference</label>
                            <select id="sort-preference" class="tb-select">
                                <option value="date_asc">Oldest First</option>
                                <option value="date_desc">Newest First</option>
                                <option value="alpha_asc">Name A-Z</option>
                                <option value="alpha_desc">Name Z-A</option>
                            </select>
                        </div>

                        <hr class="tb-hr">

                        <div class="tb-subhead">Display Options</div>
                        <div class="tb-row-between">
                            <span class="tb-color-text">Show Tag Column</span>
                            <input type="checkbox" id="toggle-tag-visibility" class="tb-checkbox"/>
                        </div>
                        <div class="tb-row-between">
                            <span class="tb-color-text">Click Tag in Release Name to Block</span>
                            <input type="checkbox" id="toggle-click-to-block" class="tb-checkbox"/>
                        </div>

                        <div class="tb-field tb-mt">
                            <div class="tb-row-between">
                                <div class="tb-row">
                                    <input type="color" id="highlight-color-picker" class="tb-color-picker" value="${DEFAULT_COLOR_PICKER}"/>
                                    <div class="tb-color-text">Followed Tag Highlight Color</div>
                                </div>
                                <button id="reset-highlight-color" class="tb-btn tb-btn-warning tb-btn-small">Reset</button>
                            </div>
                        </div>

                        <hr class="tb-hr">

                        <div class="tb-subhead">Data Management</div>
                        <div class="tb-actions">
                            <button id="import-data" class="tb-btn tb-btn-flex" title="Import tags and rules from a JSON file">Import</button>
                            <button id="export-data" class="tb-btn tb-btn-flex" title="Export all tags and rules as a JSON file">Export</button>
                            <button id="delete-all-tags" class="tb-btn tb-btn-danger tb-btn-flex" title="Delete all tags and reset settings to default">Reset</button>
                        </div>
                    </div>
                </div>
                <button id="toggle-gui" class="tb-toggle-gui">Tag Blocker</button>
            `;

            document.body.insertAdjacentHTML('beforeend', guiHtml);

            document.getElementById('sort-preference').value = getSortPreference();
            document.getElementById('toggle-tag-visibility').checked = getTagVisibility();
            document.getElementById('toggle-click-to-block').checked = getClickToBlock();
            document.getElementById('highlight-color-picker').value = toPickerHex(getHighlightColor());

            refreshTagList();
            refreshAdvancedRulesList();
            refreshFollowedTagsList();

            document.querySelectorAll('.tb-tab').forEach(btn => {
                btn.addEventListener('click', () => switchTab(btn.dataset.tab));
            });

            document.getElementById('sort-preference').onchange = e => {
                if (saveSortPreference(e.target.value)) {
                    refreshTagList();
                    refreshAdvancedRulesList();
                    refreshFollowedTagsList();
                }
            };

            document.getElementById('toggle-gui').onclick = () => {
                document.getElementById('tag-blocker-gui').classList.toggle('tb-gui-open');
            };

            document.getElementById('toggle-tag-visibility').onchange = e => {
                saveTagVisibility(e.target.checked);
                updateTable();
            };

            document.getElementById('toggle-click-to-block').onchange = e => {
                saveClickToBlock(e.target.checked);
                updateTable();
            };

            document.getElementById('add-advanced-rule').onclick = addAdvancedRule;

            const followInput = document.getElementById('follow-tag-input');
            document.getElementById('add-follow-tag').onclick = () => {
                addTags(followInput.value, false);
                followInput.value = '';
            };
            followInput.onkeydown = e => {
                if (e.key === 'Enter') {
                    addTags(e.target.value, false);
                    e.target.value = '';
                }
            };

            const containsInput = document.getElementById('advanced-contains');
            const notContainsInput = document.getElementById('advanced-not-contains');
            const onlyIfInput = document.getElementById('advanced-only-if');
            containsInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); notContainsInput.focus(); } };
            notContainsInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); onlyIfInput.focus(); } };
            onlyIfInput.onkeydown = e => { if (e.key === 'Enter') addAdvancedRule(); };

            const colorPicker = document.getElementById('highlight-color-picker');
            colorPicker.onchange = e => {
                const hex = e.target.value;
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                if (saveHighlightColor(`rgba(${r}, ${g}, ${b}, 0.2)`)) highlightFollowedReleases();
            };

            document.getElementById('reset-highlight-color').onclick = () => {
                saveHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
                colorPicker.value = DEFAULT_COLOR_PICKER;
                highlightFollowedReleases();
                showNotification('Highlight color reset to default', 'info');
            };

            document.getElementById('delete-all-blocked-tags').onclick = () => deleteAllByType('blocked');
            document.getElementById('delete-all-rules').onclick = () => deleteAllByType('rules');
            document.getElementById('delete-all-followed-tags').onclick = () => deleteAllByType('followed');
            document.getElementById('delete-all-tags').onclick = deleteAllTags;
            document.getElementById('import-data').onclick = importData;
            document.getElementById('export-data').onclick = exportData;
        } catch (error) {
            console.error('Error adding GUI:', error);
            showNotification('Failed to initialize GUI', 'error');
        }
    };

    const init = () => {
        try {
            initStyles();
            addGui();
            updateTable();
            hideBlockedReleases();
        } catch (error) {
            console.error('Fatal error during initialization:', error);
            alert('Nyaa Tag Blocker failed to initialize. Check console for details.');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
