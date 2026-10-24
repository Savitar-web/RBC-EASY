import sys,pathlib,json,unicodedata,collections
sys.path.insert(0,'work/font-tools')
from fontTools.ttLib import TTFont
covered=set()
for p in list(pathlib.Path('work/font-sources').glob('*.ttf'))+list(pathlib.Path('work/font-sources').glob('*.otf')):
 f=TTFont(p); covered.update(f.getBestCmap()); dest=pathlib.Path('public/fonts/unicode')/(p.stem+'.woff2')
 if not dest.exists(): f.flavor='woff2';f.save(dest)
 print(p.stem,dest.stat().st_size,flush=True)
points=json.load(open('work/decor-codepoints.json'));missing=[c for c in points if c not in covered and not unicodedata.category(chr(c)).startswith(('C','Z'))]
print('UNCOVERED',len(missing),[(hex(c),unicodedata.name(chr(c),'UNKNOWN')) for c in missing],flush=True)
pathlib.Path('work/unicode-coverage.json').write_text(json.dumps({'codepoints':len(points),'covered':len(points)-len(missing),'missing':missing,'fontBytes':sum(p.stat().st_size for p in pathlib.Path('public/fonts/unicode').glob('*.woff2'))}))
