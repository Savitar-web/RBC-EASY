import math,struct,wave
from pathlib import Path
rate=44100;duration=64
progressions=[[(130.81,164.81,196),(110,130.81,164.81),(87.31,110,130.81),(98,123.47,146.83)],[(146.83,174.61,220),(116.54,146.83,174.61),(130.81,164.81,196),(110,138.59,164.81)],[(98,123.47,146.83),(130.81,164.81,196),(110,130.81,164.81),(87.31,110,130.81)]]
folder=Path('public/audio');folder.mkdir(exist_ok=True)
for track,chords in enumerate(progressions):
 data=bytearray()
 for sample in range(rate*duration):
  t=sample/rate;v=0
  for bar in range(8):
   start=bar*8;local=t-start
   if 0<=local<12:
    env=(1-math.exp(-local*1.2))*math.exp(-local*.28)*min(1,(12-local)/2)
    for f in chords[bar%4]:
     v+=env*(math.sin(2*math.pi*f*t)+.18*math.sin(2*math.pi*f*2*t))/24
    for note in range(4):
     age=local-note*1.8
     if 0<=age<5:
      f=chords[bar%4][(note+track)%3]*2
      v+=.045*math.sin(2*math.pi*f*age)*math.exp(-age*1.4)*(1-math.exp(-age*25))
  fade=min(1,t/3,(duration-t)/4)
  data+=struct.pack('<h',max(-32767,min(32767,round(2*v*fade*32767))))
 # Gentle stereo width with a short, blended reflection; doubled source level.
 stereo=bytearray();delay=int(rate*.018)*2
 for index in range(0,len(data),2):
  left=struct.unpack_from('<h',data,index)[0]
  reflected=struct.unpack_from('<h',data,max(0,index-delay))[0]
  right=round(.85*left+.15*reflected)
  stereo+=struct.pack('<hh',left,right)
 with wave.open(str(folder/f'ambient-{track+1}.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes(stereo)
