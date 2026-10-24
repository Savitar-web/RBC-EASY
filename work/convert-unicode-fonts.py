import sys, pathlib
sys.path.insert(0,'work/font-tools')
from fontTools.ttLib import TTFont
for source in pathlib.Path('work/font-sources').glob('*.ttf'):
 target=pathlib.Path('public/fonts/unicode')/(source.stem+'.woff2')
 font=TTFont(source); font.flavor='woff2';font.save(target)
 print(source.stem,target.stat().st_size)
