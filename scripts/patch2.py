"""Final targeted fixes for index.html."""
path = r'C:\Users\555\OneDrive\Documents\Kratong\index.html'
html = open(path, encoding='utf-8').read()

# Fix header (actual file uses & not &amp; and no leading comment match)
old_h = (
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
new_h = (
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
if old_h in html:
    html = html.replace(old_h, new_h)
    print('Header replaced OK')
else:
    print('Header NOT found, skipping')

# Fix wish span
old_wish = '          <span>Make a Wish & Float Krathong (\u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19 & \u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07)</span>'
new_wish = '          <span id="wishLabel" data-th="\u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19 &amp; \u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07" data-en="Make a Wish &amp; Float">\u0e2d\u0e18\u0e34\u0e29\u0e10\u0e32\u0e19 &amp; \u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e01\u0e23\u0e30\u0e17\u0e07</span>'
if old_wish in html:
    html = html.replace(old_wish, new_wish)
    print('Wish label replaced OK')
else:
    print('Wish label NOT found, skipping')

open(path, 'w', encoding='utf-8').write(html)
print('Done')
