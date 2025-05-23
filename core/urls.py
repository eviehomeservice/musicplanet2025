from django.urls import path
from . import views
from .views import save_music

urlpatterns = [
    path('', views.home, name='home'),
    path('spirits/', views.spirits, name='spirits'),
    path('record/', views.record, name='record'),
    path('collage/', views.collage, name='collage'),
    path('my-music/', views.my_music, name='my_music'),
    path('save_music/', save_music, name='save_music'),
]