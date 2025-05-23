document.addEventListener('DOMContentLoaded', function() {
    // 初始化元素引用
    const spirits = document.querySelectorAll('.spirit');
    const track = document.getElementById('music-track');
    const saveBtn = document.getElementById('save-melody');
    const playBtn = document.getElementById('play-melody');
    
    // 音频相关变量
    let audioContext;
    let currentMelody = [];
    const notes = {
        'do': { audio: '/static/audio/do.mp3', color: '#ff6b6b' },
        'mi': { audio: '/static/audio/mi.mp3', color: '#48dbfb' },
        'fa': { audio: '/static/audio/fa.mp3', color: '#1dd1a1' }
    };

    // 初始化音频系统
    async function initAudio() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 预加载所有音频样本
            await Promise.all(Object.keys(notes).map(async (note) => {
                const response = await fetch(notes[note].audio);
                const arrayBuffer = await response.arrayBuffer();
                notes[note].buffer = await audioContext.decodeAudioData(arrayBuffer);
            }));
            
            console.log('音频系统初始化完成');
        } catch (error) {
            console.error('音频初始化失败:', error);
            alert('音频功能初始化失败，请刷新页面重试');
        }
    }

    // 播放当前旋律
    function playMelody() {
        if (currentMelody.length === 0) {
            alert('请先添加音符到音轨！');
            return;
        }

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.5;
        gainNode.connect(audioContext.destination);

        currentMelody.forEach((note, index) => {
            const source = audioContext.createBufferSource();
            source.buffer = note.buffer;
            source.connect(gainNode);
            source.start(audioContext.currentTime + index * 0.5);
        });
    }

    // 生成WAV格式音频Blob
    function generateWAVBlob(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numChannels * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);

        // 写入WAV文件头
        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * 2 * numChannels, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, length, true);

        // 写入PCM数据
        let offset = 44;
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            const channel = audioBuffer.getChannelData(i);
            for (let j = 0; j < channel.length; j++) {
                const sample = Math.max(-1, Math.min(1, channel[j]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([view], { type: 'audio/wav' });
    }

    // 保存旋律为MP3并添加到我的音乐
    async function saveMelody() {
        if (currentMelody.length === 0) {
            alert('请先创建旋律！');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';

        try {
            // 1. 使用离线音频上下文渲染音频
            const offlineCtx = new OfflineAudioContext(
                1, 
                audioContext.sampleRate * currentMelody.length * 0.6, 
                audioContext.sampleRate
            );
            
            const gainNode = offlineCtx.createGain();
            gainNode.gain.value = 0.8;
            gainNode.connect(offlineCtx.destination);

            // 添加所有音符
            currentMelody.forEach((note, index) => {
                const source = offlineCtx.createBufferSource();
                source.buffer = note.buffer;
                source.connect(gainNode);
                source.start(index * 0.5);
            });

            // 2. 渲染音频
            const renderedBuffer = await offlineCtx.startRendering();
            const wavBlob = generateWAVBlob(renderedBuffer);

            // 3. 使用lamejs转换为MP3
            const wavArrayBuffer = await wavBlob.arrayBuffer();
            const wavData = new Int16Array(wavArrayBuffer);
            
            const mp3encoder = new lamejs.Mp3Encoder(1, 44100, 128);
            const mp3Data = mp3encoder.encodeBuffer(wavData);
            const mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' });

            // 4. 触发下载
            const url = URL.createObjectURL(mp3Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `melody_${new Date().toISOString().slice(0,10)}.mp3`;
            document.body.appendChild(a);
            a.click();
            
            // 5. 保存到我的音乐列表
            const formData = new FormData();
            formData.append('melody', mp3Blob, `melody_${new Date().toISOString().slice(0,10)}.mp3`);
            formData.append('title', `音符精灵 ${new Date().toLocaleString()}`);
            formData.append('music_type', 'spirits');

            const response = await fetch('/save_music/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: formData
            });
            
            if (!response.ok) throw new Error('保存到我的音乐失败');
            
            alert('旋律已保存并添加到我的音乐！');

        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 保存旋律';
        }
    }

    // 获取CSRF Token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // 初始化音符元素
    function initSpirits() {
        spirits.forEach(spirit => {
            // 点击播放单个音符
            spirit.addEventListener('click', function() {
                const note = this.dataset.note;
                if (!notes[note]?.buffer) return;
                
                const source = audioContext.createBufferSource();
                source.buffer = notes[note].buffer;
                source.connect(audioContext.destination);
                source.start();
            });

            // 拖拽设置
            spirit.draggable = true;
            spirit.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('note', this.dataset.note);
            });
        });
    }

    // 初始化音轨区域
    function initTrackArea() {
        track.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });

        track.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        track.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            const noteName = e.dataTransfer.getData('note');
            if (!notes[noteName]) return;
            
            // 添加可视化音符
            const noteElement = document.createElement('div');
            noteElement.className = 'track-note';
            noteElement.style.backgroundColor = notes[noteName].color;
            noteElement.textContent = noteName.toUpperCase();
            noteElement.dataset.note = noteName;
            
            this.appendChild(noteElement);
            currentMelody.push(notes[noteName]);
        });
    }

    // 初始化按钮事件
    function initButtons() {
        playBtn.addEventListener('click', playMelody);
        saveBtn.addEventListener('click', saveMelody);
    }

    // 主初始化流程
    (async function() {
        await initAudio();
        initSpirits();
        initTrackArea();
        initButtons();
        console.log('音符精灵初始化完成');
    })();
});