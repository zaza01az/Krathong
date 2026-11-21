html = open(r'C:\Users\555\OneDrive\Documents\Kratong\index.html', encoding='utf-8').read()
checks = [
    ('lang=th', 'lang="th"' in html),
    ('site-title id', 'id="site-title"' in html),
    ('langBtn', 'id="langBtn"' in html),
    ('No Luminous Graphic', 'Luminous Graphic' not in html),
    ('No Split Dual View', 'Split Dual View' not in html),
    ('Split View button', 'data-mode="split"' in html),
    ('mode buttons count == 2', html.count('data-mode=') == 2),
    ('No graphic mode btn', 'data-mode="graphic"' not in html),
    ('wishLabel', 'id="wishLabel"' in html),
]
for name, ok in checks:
    print(('OK  ' if ok else 'FAIL'), name)
