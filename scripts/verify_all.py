import re
import sys

def verify():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('src/app.js', 'r', encoding='utf-8') as f:
        app_js = f.read()

    with open('src/audio.js', 'r', encoding='utf-8') as f:
        audio_js = f.read()

    with open('src/engine.js', 'r', encoding='utf-8') as f:
        engine_js = f.read()

    # 1. Check getElementById in app.js
    id_matches = re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", app_js)
    missing_ids = []
    for el_id in set(id_matches):
        if f'id="{el_id}"' not in html and f"id='{el_id}'" not in html:
            missing_ids.append(el_id)

    print('Missing getElementById IDs in index.html:', missing_ids)
    if missing_ids:
        sys.exit(1)

    # 2. Check querySelector / querySelectorAll in app.js
    qs_matches = re.findall(r"querySelector(?:All)?\(['\"]#([a-zA-Z0-9_-]+)['\"]\)", app_js)
    missing_qs = []
    for el_id in set(qs_matches):
        if f'id="{el_id}"' not in html and f"id='{el_id}'" not in html:
            missing_qs.append(el_id)

    print('Missing querySelector IDs in index.html:', missing_qs)
    if missing_qs:
        sys.exit(1)

    # 3. Check audio methods called by app.js
    audio_calls = re.findall(r"this\.audio\.([a-zA-Z0-9_]+)\(", app_js)
    print('Audio calls from app.js:', set(audio_calls))
    for call in set(audio_calls):
        assert call in audio_js, f'Audio missing method: {call}'

    # 4. Check engine methods called by app.js
    engine_calls = re.findall(r"this\.engine\.([a-zA-Z0-9_]+)\(", app_js)
    print('Engine calls from app.js:', set(engine_calls))
    for call in set(engine_calls):
        assert call in engine_js, f'Engine missing method: {call}'

    # 5. Check 'ค้างคาวกินกล้วย' in audio.js
    assert 'ค้างคาวกินกล้วย' in audio_js, 'ค้างคาวกินกล้วย not mentioned in audio.js'
    assert 'Ranat' in audio_js or 'ranat' in audio_js, 'Ranat not in audio.js'
    assert 'Ching' in audio_js or 'ching' in audio_js, 'Ching not in audio.js'
    assert 'Taphon' in audio_js or 'taphon' in audio_js, 'Taphon/Drum not in audio.js'

    # 6. Check font imports in index.html & style.css
    assert 'Noto+Serif+Thai' in html, 'Noto Serif Thai not imported in index.html'
    assert 'Sarabun' in html, 'Sarabun not imported in index.html'

    print('\n[SUCCESS] ALL PROGRAMMATIC BINDINGS AND ATTRIBUTES VERIFIED 100% CLEAN!')

if __name__ == '__main__':
    verify()
