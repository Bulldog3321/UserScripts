// ==UserScript==
// @name         Daily Uploads - File Search
// @description  Adds filename searching to Daily Uploads user pages
// @author       Bulldog
// @version      1.0
// @icon         https://dailyuploads.net/images/favicon/favicon.ico
// @namespace    https://github.com/Bulldog3321/UserScripts
// @downloadURL  https://bulldog3321.github.io/UserScripts/Daily%20Uploads%20-%20File%20Search/dailyuploads-file-search.user.js
// @supportURL   https://github.com/Bulldog3321/UserScripts/issues
// @match        https://dailyuploads.net/users/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var STYLE = `
        #du-search {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            width: 100%;
            box-sizing: border-box;
            margin: 0 0 16px;
        }
        #du-search .du-field {
            position: relative;
            flex: 1 1 260px;
            min-width: 200px;
        }
        #du-search input {
            width: 100%;
            box-sizing: border-box;
            height: 44px;
            padding: 0 36px 0 14px;
            font-size: 14px;
            color: var(--text, #16181b);
            background: #fff;
            border: 1px solid var(--border, #cccccc);
            border-radius: var(--radius-sm, 8px);
            outline: none;
            transition: border-color .2s, box-shadow .2s;
        }
        #du-search input:focus {
            border-color: var(--brand-700, #b91c1c);
            box-shadow: 0 0 0 3px rgba(185, 28, 28, .15);
        }
        #du-search .du-x {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 32px;
            height: 32px;
            line-height: 30px;
            text-align: center;
            font-size: 16px;
            color: var(--text-3, #6c757d);
            background: transparent;
            border: none;
            border-radius: var(--radius-sm, 8px);
            cursor: pointer;
            display: none;
            padding: 0;
        }
        #du-search .du-x:hover {
            color: var(--text, #16181b);
            background: var(--bg-soft, #f8f9fb);
        }
        #du-search input:not(:placeholder-shown) ~ .du-x {
            display: block;
        }
        #du-search .du-btn {
            height: 44px;
            padding: 0 24px;
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            background: var(--brand-700, #b91c1c);
            border: none;
            border-radius: var(--radius-sm, 8px);
            cursor: pointer;
            white-space: nowrap;
            transition: opacity .15s, background .15s;
        }
        #du-search .du-btn:hover {
            opacity: .9;
            background: var(--brand-600, #dc2626);
        }
        #du-search .du-cancel {
            background: var(--text-3, #6c757d);
        }
        #du-count {
            display: none;
            flex-basis: 100%;
            text-align: center;
            color: var(--text-3, #6c757d);
            font-size: 13px;
            margin-top: 4px;
            min-height: 16px;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        #du-count .du-back {
            width: 32px;
            height: 32px;
            line-height: 30px;
            text-align: center;
            font-size: 16px;
            color: var(--text-3, #6c757d);
            background: transparent;
            border: 1px solid var(--border, #cccccc);
            border-radius: var(--radius-sm, 8px);
            cursor: pointer;
            padding: 0;
        }
        #du-count .du-back:hover {
            color: var(--text, #16181b);
            background: var(--bg-soft, #f8f9fb);
            border-color: var(--border-2, #dee2e6);
        }
        .du-hidden {
            display: none !important;
        }
    `;

    var HTML = `
        <div id="du-search">
            <div class="du-field">
                <input type="text" placeholder="Search all uploads by filename..." autocomplete="off">
                <button class="du-x" type="button">&times;</button>
            </div>
            <button class="du-btn" type="button">Search</button>
            <span id="du-count">
                <button class="du-back" type="button" style="display:none">&#8617;</button>
                <span class="du-text"></span>
            </span>
        </div>
    `;

    var FILES_SEL = '#files_list';
    var SEARCH_BAR = '#du-search';
    var COUNT_TEXT = '#du-count .du-text';
    var BACK_BTN = SEARCH_BAR + ' .du-back';
    var BTN = SEARCH_BAR + ' .du-btn';
    var PAGING = '#files_paging, .files_paging';
    var PER_PAGE = 500;

    function SearchApp($) {
        this.$ = $;
        this.cfg = { user: '', token: '', total: 0 };
        this.originalHtml = '';
        this.active = false;
    }

    SearchApp.prototype.parseConfig = function () {
        var scripts = document.querySelectorAll('script');
        for (var i = 0; i < scripts.length; i++) {
            var text = scripts[i].textContent || '';
            var m = text.match(/setPagination\(['"]\.files_paging['"],\s*\{[\s\S]*?\}\);/);
            if (!m) continue;
            var block = m[0];
            var read = function (key) {
                var r = block.match(new RegExp(key + "\\s*:\\s*['\"]([^'\"]+)['\"]"));
                return r ? r[1] : '';
            };
            this.cfg.user = read('usr_login');
            this.cfg.token = read('token');
            this.cfg.total = parseInt(read('total'), 10) || 0;
            return !!(this.cfg.user && this.cfg.token);
        }
        return false;
    };

    SearchApp.prototype.hidePaging = function () {
        this.$(PAGING).addClass('du-hidden');
    };

    SearchApp.prototype.showPaging = function () {
        this.$(PAGING).removeClass('du-hidden');
    };

    SearchApp.prototype.fetchPage = function (page) {
        var app = this;
        return new Promise(function (resolve) {
            fetch('https://dailyuploads.net/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': location.href
                },
                body: new URLSearchParams({
                    op: 'user_public',
                    load_files_list: 1,
                    load_folders_list: 0,
                    page: String(page),
                    fld_id: '',
                    usr_login: app.cfg.user,
                    token: app.cfg.token,
                    per_page: PER_PAGE
                })
            }).then(function (response) { return response.text(); })
              .then(function (text) { resolve(text); })
              .catch(function () { resolve(''); });
        });
    };

    SearchApp.prototype.extractCells = function (html) {
        var $ = this.$;
        var cells = [];
        if (!html) return cells;
        $('<div>').html(html).find('.col').each(function () {
            if ($(this).find('div.link a').length) {
                cells.push(this.outerHTML);
            }
        });
        return cells;
    };

    SearchApp.prototype.getCellName = function (cellHtml) {
        var $ = this.$;
        var href = $('<div>').html(cellHtml).find('div.link a').attr('href') || '';
        var parts = href.split('/');
        return (parts[parts.length - 1] || '').toLowerCase();
    };

    SearchApp.prototype.renderResults = function (cells, query) {
        var matches = cells.filter(function (c) {
            return this.getCellName(c).indexOf(query) !== -1;
        }, this);
        $(FILES_SEL).html(matches.join(''));
        return matches.length;
    };

    SearchApp.prototype.setCount = function (text) {
        var el = $(COUNT_TEXT);
        var parent = el.parent();
        if (text) {
            el.text(text);
            parent.css('display', 'flex');
        } else {
            el.text('');
            parent.css('display', 'none');
        }
    };

    SearchApp.prototype.cancelSearch = function () {
        this.active = false;
        this.$(BTN).text('Search').removeClass('du-cancel');
        this.showPaging();
        this.$(BACK_BTN).hide();
        this.setCount('');
    };

    SearchApp.prototype.startSearch = function (query) {
        var app = this;
        var allCells = [];
        var pages = Math.ceil(this.cfg.total / PER_PAGE);
        var page = 0;

        this.active = true;
        this.$(BTN).text('Cancel').addClass('du-cancel');
        this.$(BACK_BTN).hide();
        this.hidePaging();
        this.setCount('Fetching all ' + this.cfg.total + ' files...');

        (function next() {
            if (!app.active) return;
            page++;
            if (page > pages) {
                var matches = allCells.filter(function (c) {
                    return app.getCellName(c).indexOf(query) !== -1;
                });
                var count = app.renderResults(allCells, query);
                app.setCount('Found ' + count + ' of ' + allCells.length + ' files');
                app.$(BACK_BTN).show();
                app.$(BTN).text('Search').removeClass('du-cancel');
                app.active = false;
                return;
            }
            app.fetchPage(page).then(function (html) {
                if (!app.active) return;
                if (html) {
                    allCells = allCells.concat(app.extractCells(html));
                }
                app.setCount('Fetched ' + allCells.length + ' of ' + app.cfg.total + '...');
                next();
            });
        })();
    };

    SearchApp.prototype.buildUI = function () {
        if (this.$(SEARCH_BAR).length) return;

        var $ = this.$;
        var app = this;

        $('<style>').text(STYLE).appendTo('head');
        $(FILES_SEL).before($(HTML));

        this.originalHtml = $(FILES_SEL).html();

        var input = $(SEARCH_BAR + ' input');
        var btn = $(BTN);
        var back = $(BACK_BTN);

        btn.on('click', function () {
            if (btn.hasClass('du-cancel')) {
                app.cancelSearch();
                return;
            }
            var query = input.val().toLowerCase().trim();
            if (!query) return;
            if (!app.parseConfig()) {
                app.setCount('Could not read page config.');
                return;
            }
            app.startSearch(query);
        });

        back.on('click', function () {
            app.cancelSearch();
            $(FILES_SEL).html(app.originalHtml);
            app.showPaging();
        });

        $(SEARCH_BAR + ' .du-x').on('click', function () {
            input.val('').focus();
        });

        input.on('keydown', function (e) {
            if (e.which === 13) btn.click();
        });
    };

    function init() {
        var $ = window.jQuery || window.$;
        if (!$ || !$.fn || !document.querySelector('#files_list')) return;

        var app = new SearchApp($);
        app.buildUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
