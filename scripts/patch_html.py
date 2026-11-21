"""Patch index.html: mobile-friendly, language toggle, clean emoji."""
import re

path = r'C:\Users\555\OneDrive\Documents\Kratong\index.html'
html = open(path, 'r', encoding='utf-8').read()

# ── 1. Header ────────────────────────────────────────────────────────────────
old_header = (
    '<header>\n'
    '    <div class="logo-group">\n'
    '      <div class="logo-icon">\U0001fab7</div>\n'
    '      <div class="title-text">\n'
    '        <h1>LOY KRATHONG FESTIVAL (\u0e1b\u0e23\u0e30\u0e40\u0e1e\u0e13\u0e35\u0e25\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07)</h1>\n'
    '        <p>3D Mathematical Terminal & Real-Time Numeric ASCII Simulation</p>\n'
    '      </div>\n'
    '    </div>\n'
    '    <div class="header-badges">\n'
    '      <div class="badge fps-badge" id="fpsDisplay">60 FPS</div>\n'
    '      <div class="badge">120 \u00d7 44 Grid</div>\n'
    '      <button class="btn" id="audioBtn"> Music: OFF</button>\n'
    '    </div>\n'
    '  </header>'
)
new_header = (
    '<header>\n'
    '    <div class="logo-group">\n'
    '      <div class="logo-icon">\U0001fab7</div>\n'
    '      <div class="title-text">\n'
    '        <h1 id="site-title">\u0e1b\u0e23\u0e30\u0e40\u0e1e\u0e13\u0e35\u0e25\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07</h1>\n'
    '        <p id="site-subtitle">\u0e08\u0e33\u0e25\u0e2d\u0e07 3D \u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23 ASCII \u0e40\u0e0a\u0e34\u0e07\u0e04\u0e13\u0e34\u0e15\u0e28\u0e32\u0e2a\u0e15\u0e23\u0e4c</p>\n'
    '      </div>\n'
    '    </div>\n'
    '    <div class="header-badges">\n'
    '      <div class="badge fps-badge" id="fpsDisplay">60 FPS</div>\n'
    '      <div class="badge" id="gridBadge">120 \u00d7 44</div>\n'
    '      <button class="btn lang-toggle" id="langBtn">TH / EN</button>\n'
    '      <button class="btn" id="audioBtn" data-th="\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1e\u0e25\u0e07: \u0e1b\u0e34\u0e14" data-en="Music: OFF">\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1e\u0e25\u0e07: \u0e1b\u0e34\u0e14</button>\n'
    '    </div>\n'
    '  </header>'
)
html = html.replace(old_header, new_header)

# ── 2. Mode buttons ───────────────────────────────────────────────────────────
html = html.replace(
    '<div class="mode-switch-group">\n'
    '          <button class="mode-btn active" data-mode="ascii">\U0001f4df Numeric ASCII Matrix (Python 1:1)</button>\n'
    '          <button class="mode-btn" data-mode="graphic">\U0001f338 Luminous Graphic</button>\n'
    '          <button class="mode-btn" data-mode="split">\U0001f500 Split Dual View</button>\n'
    '        </div>',
    '<div class="mode-switch-group">\n'
    '          <button class="mode-btn active" data-mode="ascii" data-th="ASCII Matrix" data-en="ASCII Matrix">ASCII Matrix</button>\n'
    '          <button class="mode-btn" data-mode="split" data-th="\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07\u0e04\u0e39\u0e48" data-en="Split View">\u0e21\u0e38\u0e21\u0e21\u0e2d\u0e07\u0e04\u0e39\u0e48</button>\n'
    '        </div>'
)

# ── 3. Sidebar headings ───────────────────────────────────────────────────────
html = html.replace(
    '<h3>\U0001f3a8 Character &amp; Display</h3>',
    '<h3 data-th="\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23 &amp; \u0e08\u0e2d\u0e41\u0e2a\u0e14\u0e07\u0e1c\u0e25" data-en="Character &amp; Display">\u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23 &amp; \u0e08\u0e2d\u0e41\u0e2a\u0e14\u0e07\u0e1c\u0e25</h3>'
)
html = html.replace(
    '<h3>\U0001fab7 Krathong &amp; Atmosphere</h3>',
    '<h3 data-th="\u0e01\u0e23\u0e30\u0e17\u0e07 &amp; \u0e1a\u0e23\u0e23\u0e22\u0e32\u0e01\u0e32\u0e28" data-en="Krathong &amp; Atmosphere">\u0e01\u0e23\u0e30\u0e17\u0e07 &amp; \u0e1a\u0e23\u0e23\u0e22\u0e32\u0e01\u0e32\u0e28</h3>'
)
html = html.replace(
    '<h3>\U0001f30a Physics &amp; Lighting</h3>',
    '<h3 data-th="\u0e1f\u0e34\u0e2a\u0e34\u0e01\u0e2a\u0e4c &amp; \u0e41\u0e2a\u0e07" data-en="Physics &amp; Lighting">\u0e1f\u0e34\u0e2a\u0e34\u0e01\u0e2a\u0e4c &amp; \u0e41\u0e2a\u0e07</h3>'
)
html = html.replace(
    '<h3>\U0001f4be Export &amp; Code</h3>',
    '<h3 data-th="\u0e2a\u0e48\u0e07\u0e2d\u0e2d\u0e01 &amp; \u0e42\u0e04\u0e49\u0e14" data-en="Export &amp; Code">\u0e2a\u0e48\u0e07\u0e2d\u0e2d\u0e01 &amp; \u0e42\u0e04\u0e49\u0e14</h3>'
)

# ── 4. Export button text (strip emoji) ───────────────────────────────────────
html = html.replace('\U0001f4cb Copy ASCII', 'Copy ASCII')
html = html.replace('\U0001f308 Copy ANSI', 'Copy ANSI')
html = html.replace('\U0001f4f8 Save PNG', 'Save PNG')
html = html.replace('\u23f8\ufe0f Pause', 'Pause')
html = html.replace('\U0001f4dc Inspect Math &amp; Python Code', 'Inspect Math Code')

# ── 5. Floating action labels ─────────────────────────────────────────────────
html = html.replace(
    '          <span>Make a Wish &amp; Float Krathong (\u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19 &amp; \u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07)</span>',
    '          <span id="wishLabel" data-th="\u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19 &amp; \u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07" data-en="Make a Wish &amp; Float">\u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19 &amp; \u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07</span>'
)
html = html.replace(
    '          <span>Release Sky Lantern (\u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e42\u0e04\u0e21\u0e25\u0e2d\u0e22)</span>',
    '          <span id="lanternLabel" data-th="\u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e42\u0e04\u0e21\u0e25\u0e2d\u0e22" data-en="Release Sky Lantern">\u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e42\u0e04\u0e21\u0e25\u0e2d\u0e22</span>'
)

# ── 6. Modals ─────────────────────────────────────────────────────────────────
html = html.replace(
    '<h2>\U0001fab7 \u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19\u0e25\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07 (Float Your Wish)</h2>',
    '<h2 id="wishModalTitle" data-th="\u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19\u0e25\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07" data-en="Float Your Wish">\u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19\u0e25\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07</h2>'
)
html = html.replace(
    '<h2>\U0001f4dc Mathematical Model &amp; Python Source</h2>',
    '<h2>\u0e42\u0e21\u0e40\u0e14\u0e25\u0e04\u0e13\u0e34\u0e15\u0e28\u0e32\u0e2a\u0e15\u0e23\u0e4c</h2>'
)
html = html.replace(
    '\U0001f56f\ufe0f Light Candle &amp; Release Krathong onto River',
    '\u0e08\u0e38\u0e14\u0e40\u0e17\u0e35\u0e22\u0e19 &amp; \u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07'
)

open(path, 'w', encoding='utf-8').write(html)
print('HTML patched OK')
