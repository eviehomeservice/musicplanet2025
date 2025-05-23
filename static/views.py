import os
import uuid
import requests
from io import BytesIO
from PIL import Image
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.conf import settings
from .models import ParallelLife
from .forms import ParallelLifeForm

# DeepSeek API配置
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/images/generations"
DEFAULT_PROMPTS = {
    "1920s": "portrait of a {profession} in 1920s, vintage style, sepia tones, highly detailed",
    "1950s": "1950s {profession}, classic mid-century style, Kodachrome film look",
    "1980s": "1980s {profession}, vibrant colors, retro fashion, film grain",
    "2020s": "modern {profession}, high resolution, professional photography",
    "future": "futuristic {profession}, cyberpunk style, neon lights, sci-fi"
}

@login_required
def create_parallel_life(request):
    if request.method == 'POST':
        form = ParallelLifeForm(request.POST, request.FILES)
        if form.is_valid():
            instance = form.save(commit=False)
            instance.user = request.user
            instance.save()
            
            # 准备生成参数
            era = instance.era
            profession = instance.profession
            prompt = instance.custom_prompt or DEFAULT_PROMPTS[era].format(profession=profession)
            
            try:
                # 生成AI图片
                generated_path = generate_ai_image(
                    original_image_path=instance.original_image.path,
                    prompt=prompt,
                    output_dir=os.path.join(settings.MEDIA_ROOT, 'generated')
                )
                instance.generated_image.name = os.path.relpath(generated_path, settings.MEDIA_ROOT)
                
                # 生成时间线对比图
                timeline_path = generate_timeline(
                    original_path=instance.original_image.path,
                    generated_path=generated_path,
                    output_dir=os.path.join(settings.MEDIA_ROOT, 'timelines')
                )
                instance.timeline_image.name = os.path.relpath(timeline_path, settings.MEDIA_ROOT)
                
                # 生成故事
                instance.generated_story = generate_story(era, profession, request.user.username)
                instance.save()
                
                return redirect('life:view_parallel_life', id=instance.id)
                
            except Exception as e:
                print(f"生成失败: {str(e)}")
                # 失败时使用原始图片作为fallback
                instance.generated_image = instance.original_image
                instance.save()
                return redirect('life:view_parallel_life', id=instance.id)
    else:
        form = ParallelLifeForm()
    return render(request, 'life/create.html', {'form': form})

def generate_ai_image(original_image_path, prompt, output_dir):
    """调用DeepSeek API生成图片"""
    try:
        # 1. 准备图片
        with Image.open(original_image_path) as img:
            img = img.convert("RGB")
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            image_bytes = buffer.getvalue()
        
        # 2. 调用API
        headers = {
            "Authorization": f"Bearer {settings.DEEPSEEK_CONFIG['api_key']}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "deepseek-image",
            "prompt": prompt,
            "image": image_bytes,
            "n": 1,
            "size": settings.DEEPSEEK_CONFIG.get('image_size', '1024x1024'),
            "response_format": "url"
        }
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        
        # 3. 下载并保存图片
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"generated_{uuid.uuid4()}.jpg")
        
        image_url = result['data'][0]['url']
        img_response = requests.get(image_url)
        img_response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            f.write(img_response.content)
            
        return output_path
        
    except Exception as e:
        print(f"DeepSeek API调用失败: {str(e)}")
        raise

def generate_timeline(original_path, generated_path, output_dir):
    """生成时间线对比图"""
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"timeline_{uuid.uuid4()}.jpg")
    
    original_img = Image.open(original_path)
    generated_img = Image.open(generated_path)
    
    # 调整大小
    size = (400, 400)
    original_img = original_img.resize(size)
    generated_img = generated_img.resize(size)
    
    # 创建新图像
    timeline = Image.new('RGB', (850, 400), (255, 255, 255))
    timeline.paste(original_img, (25, 0))
    timeline.paste(generated_img, (425, 0))
    timeline.save(output_path)
    
    return output_path

def generate_story(era, profession, username):
    """生成小故事"""
    stories = {
        "1920s": [
            f"在喧嚣的1920年代，{username}是一位勇敢的{profession}。",
            "那个时代充满了变革与机遇，爵士乐在街头巷尾回荡。",
            f"作为一位{profession}，{username}见证了工业革命的最后浪潮。"
        ],
        # 其他年代的故事模板...
    }
    return " ".join(stories.get(era, [
        f"在{era}年代，{username}过着截然不同的人生。",
        f"作为一名{profession}，每一天都充满了新的挑战和机遇。",
        "这是平行宇宙中的另一个你，有着不同的经历，但同样的精彩。"
    ]))

@login_required
def view_parallel_life(request, id):
    parallel_life = ParallelLife.objects.get(id=id, user=request.user)
    return render(request, 'life/view.html', {'life': parallel_life})

@login_required
def list_parallel_lives(request):
    lives = ParallelLife.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'life/list.html', {'lives': lives})