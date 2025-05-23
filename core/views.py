from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import UserMusic
from .utils.audio_utils import generate_simple_music
from .utils.ai_utils import generate_simple_music
import os
from django.conf import settings
from pydub import AudioSegment
from io import BytesIO
from django.core.files.base import ContentFile
from django.contrib.auth import logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

def home(request):
    return render(request, 'core/home.html')

@login_required
def spirits(request):
    return render(request, 'core/spirits.html')

@login_required
def record(request):
    if request.method == 'POST' and request.FILES.get('audio'):
        audio_file = request.FILES['audio']
        
        # 保存临时录音文件
        temp_path = os.path.join(settings.MEDIA_ROOT, 'user_uploads', audio_file.name)
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        with open(temp_path, 'wb+') as destination:
            for chunk in audio_file.chunks():
                destination.write(chunk)
        
        # 转文本和生成音乐
        text = transcribe_audio(temp_path)
        music_path = generate_simple_music(text)
        
        # 保存到用户音乐
        with open(music_path, 'rb') as f:
            music = UserMusic.objects.create(
                user=request.user,
                audio_file=ContentFile(f.read(), name=os.path.basename(music_path)),
                music_type='story'
            )
        
        return redirect('my_music')
    
    return render(request, 'core/record.html')

@login_required
def collage(request):
    if request.method == 'POST':
        sounds = request.FILES.getlist('sounds')
        positions = request.POST.getlist('positions')
        
        # 创建基础音轨
        collage = AudioSegment.silent(duration=8000)  # 8秒
        
        for sound, pos in zip(sounds, positions):
            audio = AudioSegment.from_file(sound)
            position = int(pos)
            collage = collage.overlay(audio, position=position)
        
        # 保存结果
        output = BytesIO()
        collage.export(output, format='mp3')
        
        music = UserMusic.objects.create(
            user=request.user,
            audio_file=ContentFile(output.getvalue(), name='collage.mp3'),
            music_type='collage'
        )
        
        return redirect('my_music')
    
    return render(request, 'core/collage.html')

@login_required
def my_music(request):
    musics = UserMusic.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'core/my_music.html', {'musics': musics})

def logout_view(request):
    logout(request)
    return redirect('home')

@csrf_exempt
@login_required
def save_music(request):
    if request.method == 'POST' and request.FILES.get('melody'):
        try:
            music = UserMusic(
                user=request.user,
                title=request.POST.get('title', '未命名作品'),
                audio_file=request.FILES['melody'],
                music_type=request.POST.get('music_type', 'spirits')
            )
            music.save()
            return JsonResponse({'status': 'success', 'id': music.id})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error'}, status=400)