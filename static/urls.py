from django.urls import path
from . import views

app_name = 'life'  # 定义应用命名空间

urlpatterns = [
    path('create/', views.create_parallel_life, name='create_parallel_life'),
    path('view/<int:id>/', views.view_parallel_life, name='view_parallel_life'),
    path('list/', views.list_parallel_lives, name='list_parallel_lives'),
]