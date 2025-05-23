from django.db import models
from django.contrib.auth.models import User

class UserMusic(models.Model):
    MUSIC_TYPES = (
        ('story', '故事音乐'),
        ('collage', '声音拼贴'),
        ('spirits', '精灵创作')
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=100, default="我的创作")
    audio_file = models.FileField(upload_to='user_music/')
    music_type = models.CharField(max_length=10, choices=MUSIC_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} ({self.get_music_type_display()})"