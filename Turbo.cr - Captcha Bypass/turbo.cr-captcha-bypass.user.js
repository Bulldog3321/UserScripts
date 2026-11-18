// ==UserScript==
// @name         Turbo.cr - Captcha Bypass
// @description  Auto-solve Altcha captchas on turbo.cr
// @author       Bulldog
// @version      1.0
// @icon         https://turbo.cr/static/favicon.svg
// @namespace    https://github.com/Bulldog3321/UserScripts
// @downloadURL  https://bulldog3321.github.io/UserScripts/Turbo.cr%20-%20Captcha%20Bypass/turbo.cr-captcha-bypass.user.js
// @supportURL   https://github.com/Bulldog3321/UserScripts/issues
// @match        https://turbo.cr/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(() => {
    'use strict';

    const getVerified = (w) => {
        try {
            if (typeof w.getState === 'function') {
                const s = w.getState();
                if (s && s.verified !== undefined) return s.verified;
            }
            return w.getAttribute('state') === 'verified';
        } catch { return false; }
    };

    const verify = (w) => {
        if (!w || w.__verifying || getVerified(w)) return;
        if (typeof w.verify !== 'function') return;
        w.__verifying = true;
        w.verify().catch(() => {}).finally(() => { w.__verifying = false; });
    };

    const solve = (w) => {
        if (w.__hooked) return verify(w);
        w.__hooked = true;
        try {
            w.addEventListener('statechange', (e) => {
                const s = e?.detail?.state;
                if (s === 'expired' || s === 'error') verify(w);
            });
        } catch { }
        verify(w);
    };

    const scan = (root) => root.querySelectorAll('altcha-widget').forEach(solve);

    scan(document);

    if (window.customElements?.whenDefined) {
        customElements.whenDefined('altcha-widget').then(() => scan(document));
    }

    setTimeout(() => scan(document), 2500);

    new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;
                if (n.matches?.('altcha-widget')) solve(n);
                else n.querySelectorAll?.('altcha-widget').forEach(solve);
            }
        }
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
