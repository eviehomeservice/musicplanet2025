from django import forms
from .models import ParallelLife

class ParallelLifeForm(forms.ModelForm):
    class Meta:
        model = ParallelLife
        fields = ['original_image', 'era', 'profession', 'custom_prompt']
        widgets = {
            'custom_prompt': forms.Textarea(attrs={'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['era'].choices = [
            ('1920s', '1920年代'),
            ('1950s', '1950年代'),
            ('1980s', '1980年代'),
            ('2020s', '2020年代'),
            ('future', '未来世界')
        ]
        self.fields['profession'].choices = [
            ('doctor', '医生'),
            ('teacher', '教师'),
            ('scientist', '科学家'),
            ('artist', '艺术家'),
            ('engineer', '工程师'),
            ('explorer', '探险家')
        ]