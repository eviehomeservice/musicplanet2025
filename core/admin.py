from django.contrib import admin
from .models import UserMusic

@admin.register(UserMusic)
class UserMusicAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'music_type', 'created_at')
    list_filter = ('music_type', 'created_at')
    search_fields = ('title', 'user__username')