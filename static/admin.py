from django.contrib import admin
from .models import ParallelLife

@admin.register(ParallelLife)
class ParallelLifeAdmin(admin.ModelAdmin):
    list_display = ('user', 'era', 'profession', 'created_at')
    list_filter = ('era', 'profession')
    search_fields = ('user__username', 'profession')