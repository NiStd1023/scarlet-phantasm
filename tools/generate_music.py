"""Scarlet Phantasm: three original themes and three boss developments.

Generate with Python, numpy, libfluidsynth and ffmpeg. The bundled TimGM6mb
sample bank and its license are under dist/music/licenses. Each stage's lead
melody has individually authored A and B sections; boss versions add new
lead phrases rather than simply changing tempo or instrumentation.
"""
import ctypes as C, os, re, subprocess, tempfile, wave
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'dist'/'music'; FONT=OUT/'licenses'/'TimGM6mb.sf2'; SR=44100
P=C.c_void_p; I=C.c_int; D=C.c_double; S=C.c_char_p
lib=C.CDLL('libfluidsynth.so.3')
def api(n,r,a):
 f=getattr(lib,n);f.restype=r;f.argtypes=a;return f
settings_new=api('new_fluid_settings',P,[]);settings_num=api('fluid_settings_setnum',I,[P,S,D]);settings_int=api('fluid_settings_setint',I,[P,S,I]);synth_new=api('new_fluid_synth',P,[P]);sfload=api('fluid_synth_sfload',I,[P,S,I]);program=api('fluid_synth_program_change',I,[P,I,I]);cc=api('fluid_synth_cc',I,[P,I,I,I]);noteon=api('fluid_synth_noteon',I,[P,I,I,I]);noteoff=api('fluid_synth_noteoff',I,[P,I,I]);write=api('fluid_synth_write_float',I,[P,I,P,I,I,P,I,I]);del_synth=api('delete_fluid_synth',None,[P]);del_settings=api('delete_fluid_settings',None,[P])
# Each string is a complete bar of melody: note name/octave and beat duration.
# Shared musical idea: a rising minor triad followed by a step downward.  After
# that brief reference, each stage unfolds its own notes, cadence and rhythm.
THEMES={
1:{'a':[
'E5/.5 G5/.5 B5/1 A5/.5 G5/.5 E5/1',
'G5/.5 E5/.5 C5/1 D5/.5 E5/.5 G5/1',
'D5/.5 G5/.5 B5/.5 D6/1 B5/.5 A5/.5 G5/.5',
'F#5/1 A5/.5 D6/.5 C6/.5 B5/.5 A5/1',
'C6/.5 B5/.5 A5/1 E5/.5 G5/.5 A5/1',
'G5/.5 E5/.5 C5/.5 E5/.5 G5/1 B5/.5 C6/.5',
'D#5/.5 F#5/.5 B5/1 A5/.5 F#5/.5 D#5/1',
'E5/1 G5/.5 B5/.5 E6/1 B5/.5 G5/.5'],
'b':[
'B5/.5 G5/.5 E5/1 F#5/.5 G5/.5 B5/1',
'C6/1 G5/.5 E5/.5 D5/.5 E5/.5 G5/1',
'D6/.5 B5/.5 G5/1 A5/.5 B5/.5 D6/1',
'A5/1 F#5/.5 D5/.5 F#5/.5 A5/.5 C6/1',
'E6/.5 C6/.5 A5/1 G5/.5 A5/.5 C6/1',
'B5/.5 G5/.5 E5/.5 C5/.5 E5/1 G5/1',
'F#5/.5 A5/.5 B5/1 D#6/.5 B5/.5 A5/1',
'G5/.5 B5/.5 E6/1 D6/.5 B5/.5 E6/1'],
'boss':[
'B5/.5 E6/.5 D6/.5 B5/.5 G5/1 F#5/.5 E5/.5',
'G5/1 C6/.5 B5/.5 G5/.5 E5/.5 D5/1',
'B5/.5 D6/.5 G6/.5 D6/.5 B5/.5 A5/.5 G5/1',
'A5/.5 F#5/.5 A5/1 D6/.5 C6/.5 A5/1',
'A5/.5 C6/.5 E6/.5 D6/.5 C6/1 A5/1',
'G5/.5 C6/.5 B5/.5 G5/.5 E5/.5 G5/.5 C6/1',
'F#5/.5 B5/.5 D#6/.5 F#6/.5 D#6/1 B5/1',
'E6/.5 D6/.5 B5/.5 G5/.5 E5/1 E6/1']},
2:{'a':[
'A4/.5 C5/.5 E5/1 D5/.5 C5/.5 A4/1',
'C5/.5 F5/1 E5/.5 C5/.5 A4/.5 G4/1',
'D5/.5 G5/.5 B5/1 A5/.5 G5/.5 D5/1',
'E5/.5 B5/.5 G5/.5 E5/.5 D5/1 E5/1',
'F5/.5 A5/.5 D6/.5 C6/.5 A5/1 F5/1',
'E5/.5 A5/.5 C6/1 B5/.5 A5/.5 E5/1',
'G#5/.5 B5/.5 E6/1 D6/.5 B5/.5 G#5/1',
'A5/1 E5/.5 C5/.5 A4/.5 C5/.5 E5/1'],
'b':[
'E5/.5 A5/.5 C6/1 B5/.5 A5/.5 G5/1',
'F5/.5 A5/.5 C6/.5 E6/.5 C6/1 A5/1',
'G5/.5 B5/.5 D6/1 C6/.5 B5/.5 G5/1',
'E6/.5 B5/.5 G5/1 F#5/.5 G5/.5 B5/1',
'A5/.5 D6/.5 F6/1 E6/.5 D6/.5 A5/1',
'C6/.5 E6/.5 A6/.5 G6/.5 E6/1 C6/1',
'B5/.5 G#5/.5 E5/1 G#5/.5 B5/.5 D6/1',
'C6/.5 B5/.5 A5/1 E5/.5 G5/.5 A5/1'],
'boss':[
'E5/.5 A5/.5 C6/.5 B5/.5 A5/.5 E5/.5 G5/1',
'A5/.5 C6/.5 F6/.5 E6/.5 C6/1 A5/1',
'B5/.5 D6/.5 G6/.5 D6/.5 B5/.5 A5/.5 G5/1',
'B5/.5 G5/.5 E5/.5 G5/.5 B5/1 D6/1',
'D6/.5 A5/.5 F5/.5 A5/.5 D6/1 F6/1',
'C6/.5 B5/.5 A5/.5 E5/.5 C5/.5 E5/.5 A5/1',
'G#5/.5 B5/.5 D6/.5 E6/.5 B5/.5 G#5/.5 E5/1',
'A5/.5 C6/.5 E6/.5 A6/.5 E6/1 A5/1']},
3:{'a':[
'D5/.5 F5/.5 A5/1 G5/.5 F5/.5 D5/1',
'F5/.5 Bb5/.5 D6/1 C6/.5 Bb5/.5 F5/1',
'G5/.5 Bb5/.5 D6/.5 G6/.5 F6/.5 D6/.5 Bb5/1',
'A5/1 C#6/.5 E6/.5 D6/.5 C#6/.5 A5/1',
'D6/.5 A5/.5 F5/1 G5/.5 A5/.5 D6/1',
'Bb5/.5 D6/.5 F6/1 D6/.5 C6/.5 Bb5/1',
'G5/.5 Bb5/.5 D6/1 C6/.5 Bb5/.5 G5/1',
'A5/.5 C#6/.5 E6/1 G6/.5 E6/.5 C#6/1'],
'b':[
'A5/.5 D6/.5 F6/1 E6/.5 D6/.5 A5/1',
'F6/.5 D6/.5 Bb5/1 C6/.5 D6/.5 F6/1',
'D6/.5 Bb5/.5 G5/.5 Bb5/.5 D6/1 G6/1',
'E6/.5 C#6/.5 A5/1 C#6/.5 E6/.5 G6/1',
'F6/.5 E6/.5 D6/1 A5/.5 F5/.5 D5/1',
'Bb5/.5 D6/.5 F6/.5 A6/.5 F6/1 D6/1',
'G6/.5 F6/.5 D6/1 Bb5/.5 A5/.5 G5/1',
'A5/.5 C#6/.5 E6/.5 G6/.5 E6/1 D6/1'],
'boss':[
'A5/.5 D6/.5 F6/.5 E6/.5 D6/.5 A5/.5 F5/1',
'F5/.5 Bb5/.5 D6/.5 F6/.5 D6/1 Bb5/1',
'G5/.5 D6/.5 G6/.5 F6/.5 D6/.5 Bb5/.5 G5/1',
'C#6/.5 E6/.5 A6/1 G6/.5 E6/.5 C#6/1',
'F6/.5 E6/.5 D6/.5 A5/.5 F5/.5 A5/.5 D6/1',
'D6/.5 F6/.5 Bb6/.5 A6/.5 F6/1 D6/1',
'G6/.5 D6/.5 Bb5/.5 G5/.5 Bb5/.5 D6/.5 G6/1',
'E6/.5 C#6/.5 A5/.5 C#6/.5 E6/.5 G6/.5 A6/1']}}
CFG={
1:dict(bpm=166,boss_bpm=180,roots=[40,36,43,38,45,36,35,40],chords=[[0,3,7],[0,4,7],[0,4,7],[0,4,7],[0,3,7],[0,4,7],[0,4,7,10],[0,3,7]],lead=56,answer=0,pad=48),
2:dict(bpm=174,boss_bpm=188,roots=[45,41,43,40,38,45,40,45],chords=[[0,3,7],[0,4,7],[0,4,7],[0,3,7],[0,3,7],[0,3,7],[0,4,7,10],[0,3,7]],lead=40,answer=0,pad=48),
3:dict(bpm=184,boss_bpm=198,roots=[38,34,31,33,38,34,31,33],chords=[[0,3,7],[0,4,7],[0,3,7],[0,4,7,10],[0,3,7],[0,4,7],[0,3,7],[0,4,7,10]],lead=56,answer=61,pad=48)}
NOTES={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def parse_bar(text):
 events=[];beat=0
 for token in text.split():
  name,raw=token.split('/');duration=float(raw)
  if name!='-':
   m=re.fullmatch(r'([A-G])([#b]?)(\d)',name)
   if not m:raise ValueError(name)
   note=12*(int(m[3])+1)+NOTES[m[1]]+(1 if m[2]=='#' else -1 if m[2]=='b' else 0)
   events.append((beat,note,duration))
  beat+=duration
 if abs(beat-4)>1e-6:raise ValueError(f'Expected 4 beats, got {beat}: {text}')
 return events
class Score:
 def __init__(self):self.events=[]
 def n(self,ch,pitch,start,duration,vel):
  pitch=int(max(0,min(127,pitch)));vel=int(max(1,min(127,vel)));self.events.append((max(0,start),1,ch,pitch,vel));self.events.append((max(0,start+duration),0,ch,pitch,0))
def melody_bars(stage,boss):
 theme=THEMES[stage];a=theme['boss'] if boss else theme['a'];b=theme['b']
 # Each section states its theme, develops it, then returns with a new cadence.
 return a+b+[a[0],a[1],b[2],a[3],b[4],a[5],b[6],a[7]]
def compose(stage,boss):
 c=CFG[stage];sec=60/(c['boss_bpm'] if boss else c['bpm']);bars=melody_bars(stage,boss);score=Score()
 for bar,line in enumerate(bars):
  base=bar*4;idx=bar%8;root=c['roots'][idx];chord=c['chords'][idx];section=bar//8
  # The authored lead uses varied durations and cadences; a sparse answer adds depth.
  for j,(off,pitch,duration) in enumerate(parse_bar(line)):
   velocity=94+(j==0)*9+(section==1)*4+(boss*3)
   score.n(0,pitch,(base+off)*sec,max(.15,duration*.88)*sec,velocity)
   if (j in (1,3) and bar%2==1):score.n(1,pitch-12,(base+off+.06)*sec,min(.42,duration*.8)*sec,58+(boss*5))
  # Chords on strings/piano, with space for melody.
  for off in (0,2):
   for delta in chord[:3]:score.n(2,root+24+delta,(base+off)*sec,1.55*sec,46+(section==1)*5)
  # Independent bass groove with fifths, not parallel to the lead.
  for off,interval in [(0,0),(.75,0),(1.5,7),(2,0),(2.75,0),(3.5,7)]:score.n(3,root+interval,(base+off)*sec,.38*sec,78+(boss*8))
  arp=[0,1,2,1,0,2,1,2]
  for j in range(8):
   if stage==1 and j%2:continue
   pitch=root+24+chord[arp[(j+bar)%8]]
   score.n(4,pitch,(base+j*.5)*sec,.32*sec,43+(j%2)*5+(section==1)*5)
  # Rock drum kit: kick, snare and hat; boss section introduces sixteenth drive.
  kicks=[0,1.5,2,3.5] if stage!=2 else [0,1,2,3]
  for off in kicks:score.n(9,36,(base+off)*sec,.10*sec,98+(boss*8))
  for off in (1,3):score.n(9,38,(base+off)*sec,.10*sec,103+(boss*7))
  hats=16 if boss else 8
  for j in range(hats):score.n(9,42,(base+j*(4/hats))*sec,.06*sec,47+(j%2)*10)
  if bar%4==0:score.n(9,49,base*sec,.12*sec,76+(boss*10))
  if stage==3 and bar%4==3:
   for off in (3,3.25,3.5,3.75):score.n(9,45,(base+off)*sec,.08*sec,74)
 return sorted(score.events),len(bars)*4*sec
def render(stage,boss):
 events,total=compose(stage,boss);sett=settings_new();settings_num(sett,b'synth.sample-rate',SR);settings_num(sett,b'synth.gain',.55);settings_num(sett,b'synth.reverb.room-size',.27);settings_num(sett,b'synth.reverb.level',.2);settings_int(sett,b'synth.polyphony',192);synth=synth_new(sett)
 if sfload(synth,os.fsencode(FONT),1)<0:raise RuntimeError('Cannot load soundfont')
 c=CFG[stage]
 for ch,(patch,pan,volume) in enumerate([(c['lead'],64,113),(c['answer'],42,81),(c['pad'],70,74),(33,64,105),(0 if stage!=2 else 11,85,76)]):program(synth,ch,patch);cc(synth,ch,10,pan);cc(synth,ch,7,volume)
 cc(synth,9,7,104)
 left=np.zeros(int(total*SR),np.float32);right=np.zeros_like(left);position=0
 def block(end):
  nonlocal position
  end=min(len(left),end)
  if end>position:
   l=left[position:end];r=right[position:end];write(synth,end-position,C.c_void_p(l.ctypes.data),0,1,C.c_void_p(r.ctypes.data),0,1);position=end
 for when,action,ch,pitch,vel in events:
  if when>=total:break
  block(round(when*SR));(noteon(synth,ch,pitch,vel) if action else noteoff(synth,ch,pitch))
 block(len(left));del_synth(synth);del_settings(sett)
 fade=int(.025*SR)
 for channel in (left,right):channel[:fade]*=np.linspace(0,1,fade);channel[-fade:]*=np.linspace(1,0,fade)
 peak=max(float(np.max(np.abs(left))),float(np.max(np.abs(right))),.001);stereo=np.stack([left,right],axis=1)*(.90/peak);pcm=(np.clip(stereo,-1,1)*32767).astype('<i2')
 with tempfile.NamedTemporaryFile(suffix='.wav',delete=False) as f:temp=f.name
 with wave.open(temp,'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
 filename=('boss' if boss else 'stage')+str(stage)+'-v5.mp3'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',temp,'-codec:a','libmp3lame','-b:a','160k',str(OUT/filename)],check=True);os.unlink(temp)
 print(filename,'seconds',round(total,2),'rms',round(float(np.sqrt(np.mean(stereo**2))),3),flush=True)
if __name__=='__main__':
 for i in (1,2,3):render(i,False);render(i,True)
