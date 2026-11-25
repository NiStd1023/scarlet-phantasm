"""Verify stage themes have distinct melodic material and authored boss phrases."""
from pathlib import Path
import importlib.util
import sys
sys.dont_write_bytecode=True
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('score',root/'tools'/'generate_music.py')
score=importlib.util.module_from_spec(spec);spec.loader.exec_module(score)
def normalized_melody(lines):
    notes=[(note,duration) for line in lines for _,note,duration in score.parse_bar(line)]
    root_note=notes[0][0]
    return tuple((note-root_note,duration) for note,duration in notes)
themes=[]
for stage in (1,2,3):
    main=score.melody_bars(stage,False);boss=score.melody_bars(stage,True)
    assert len(main)==len(boss)==24
    for line in main+boss:score.parse_bar(line)
    assert sum(a!=b for a,b in zip(main,boss))>=8
    themes.append(normalized_melody(main))
    assert (root/'dist'/'music'/f'stage{stage}-v5.mp3').is_file()
    assert (root/'dist'/'music'/f'boss{stage}-v5.mp3').is_file()
assert len(set(themes))==3
print('PASS: three composed stage melodies and distinct boss developments')
