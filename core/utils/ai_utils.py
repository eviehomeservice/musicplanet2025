import os
from django.conf import settings
from pydub import AudioSegment
import random

def generate_simple_music(text):
    """简化版音乐生成"""
    moods = ['happy', 'sad', 'exciting', 'calm']
    mood = random.choice(moods)  # 随机选择一种心情
    
    # 使用预设音频片段组合
    base_path = os.path.join(settings.BASE_DIR, 'static', 'audio')
    note_files = [os.path.join(base_path, f'{note}.mp3') for note in ['do', 'mi', 'fa']]
    
    # 创建简单旋律
    melody = AudioSegment.silent(duration=1000)
    for _ in range(8):
        note = random.choice(note_files)
        note_audio = AudioSegment.from_file(note)
        melody += note_audio
    
    # 保存生成的音乐
    output_dir = os.path.join(settings.MEDIA_ROOT, 'user_music')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f'generated_{mood}.mp3')
    melody.export(output_path, format='mp3')
    
    return output_path