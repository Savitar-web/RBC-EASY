import sys,json,pathlib,unicodedata,collections
sys.path.insert(0,'work/font-tools')
from fontTools.ttLib import TTFont
points=json.load(open('work/decor-codepoints.json'));covered=set()
for p in pathlib.Path('work/font-sources').glob('*.ttf'): covered.update(TTFont(p).getBestCmap())
missing=[c for c in points if c not in covered and not unicodedata.category(chr(c)).startswith(('C','Z'))]
print('Missing:',len(missing));print(collections.Counter(unicodedata.name(chr(c),'UNKNOWN').split()[0] for c in missing));print([(hex(c),unicodedata.name(chr(c),'UNKNOWN')) for c in missing][:25])
