from django.db import models
from django.contrib.auth.models import User

class ParallelLife(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    original_image = models.ImageField(upload_to='originals/')
    generated_image = models.ImageField(upload_to='generated/', null=True, blank=True)
    timeline_image = models.ImageField(upload_to='timelines/', null=True, blank=True)
    era = models.CharField(max_length=50, choices=[
        ('1920s', '1920年代'),
        ('1950s', '1950年代'),
        ('1980s', '1980年代'),
        ('2020s', '2020年代'),
        ('future', '未来世界')
    ])
    profession = models.CharField(max_length=100, choices=[
        ('doctor', '医生'),
        ('teacher', '教师'),
        ('scientist', '科学家'),
        ('artist', '艺术家'),
        ('engineer', '工程师'),
        ('explorer', '探险家')
    ])
    custom_prompt = models.TextField(blank=True)
    generated_story = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username}'s {self.era} {self.profession} life"