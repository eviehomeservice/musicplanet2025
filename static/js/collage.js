document.addEventListener('DOMContentLoaded', function() {
    const beatCells = document.querySelectorAll('.beat-cell');
    const fileInput = document.querySelector('input[type="file"]');
    const previewBtn = document.getElementById('preview-button');
    const resetBtn = document.getElementById('reset-button');
    const generateBtn = document.querySelector('button[type="submit"]');
    const previewAudio = document.getElementById('preview-audio');
    
    let selectedFiles = [];
    let audioBuffers = [];
    const mp3Encoder = new lamejs.Mp3Encoder(1, 44100, 128);

    // 文件选择处理
    fileInput.addEventListener('change', function() {
        selectedFiles = Array.from(this.files);
        assignFilesToBeats();
    });

    // 自动分配文件到节拍
    function assignFilesToBeats() {
        const maxBeats = Math.min(selectedFiles.length, 8);
        
        beatCells.forEach((cell, index) => {
            cell.innerHTML = `<span>拍 ${index + 1}</span>`;
            cell.style.backgroundColor = '';
            
            if (index < maxBeats) {
                const fileName = selectedFiles[index].name.length > 15 
                    ? selectedFiles[index].name.substring(0, 12) + '...' 
                    : selectedFiles[index].name;
                
                cell.innerHTML += `<div class="file-name">${fileName}</div>`;
                cell.style.backgroundColor = '#e3f2fd';
                cell.dataset.fileIndex = index;
            }
        });
        
        if (selectedFiles.length > 8) {
            alert(`已选择 ${selectedFiles.length} 个文件，但只使用了前8个`);
        }
    }

    // 重置功能
    resetBtn.addEventListener('click', function() {
        selectedFiles = [];
        audioBuffers = [];
        fileInput.value = '';
        beatCells.forEach(cell => {
            cell.innerHTML = `<span>拍 ${parseInt(cell.dataset.beat) + 1}</span>`;
            cell.style.backgroundColor = '';
            delete cell.dataset.fileIndex;
        });
        previewAudio.src = '';
        previewAudio.style.display = 'none';
    });

    // 播放预览
    previewBtn.addEventListener('click', async function() {
        if (selectedFiles.length === 0) {
            alert('请先上传声音文件');
            return;
        }

        try {
            previewBtn.disabled = true;
            previewBtn.textContent = '加载中...';
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioBuffers = [];
            
            // 加载所有音频文件
            for (let i = 0; i < selectedFiles.length && i < 8; i++) {
                const arrayBuffer = await selectedFiles[i].arrayBuffer();
                const buffer = await audioContext.decodeAudioData(arrayBuffer);
                audioBuffers.push(buffer);
            }
            
            // 合并音频
            const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
            const mergedBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
            let offset = 0;
            
            audioBuffers.forEach(buffer => {
                mergedBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
                offset += buffer.length;
            });
            
            // 播放预览
            const source = audioContext.createBufferSource();
            source.buffer = mergedBuffer;
            source.connect(audioContext.destination);
            source.start();
            
            // 同时显示音频控件
            const wavBlob = bufferToWav(mergedBuffer);
            previewAudio.src = URL.createObjectURL(wavBlob);
            previewAudio.style.display = 'block';
            
        } catch (error) {
            console.error('播放失败:', error);
            alert('播放失败: ' + error.message);
        } finally {
            previewBtn.disabled = false;
            previewBtn.textContent = '▶ 播放拼贴';
        }
    });

    // 生成MP3并保存
    generateBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (selectedFiles.length === 0) {
            alert('请先上传声音文件');
            return;
        }

        if (audioBuffers.length === 0) {
            alert('请先点击播放按钮加载音频');
            return;
        }

        try {
            generateBtn.disabled = true;
            generateBtn.textContent = '生成中...';
            
            // 合并音频
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
            const mergedBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
            let offset = 0;
            
            audioBuffers.forEach(buffer => {
                mergedBuffer.getChannelData(0).set(buffer.getChannelData(0), offset);
                offset += buffer.length;
            });
            
            // 转换为MP3
            const wavBlob = bufferToWav(mergedBuffer);
            const wavArrayBuffer = await wavBlob.arrayBuffer();
            const wavData = new Int16Array(wavArrayBuffer);
            const mp3Data = mp3Encoder.encodeBuffer(wavData);
            const mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' });
            
            // 触发下载
            const url = URL.createObjectURL(mp3Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `collage_${new Date().toISOString().slice(0,10)}.mp3`;
            document.body.appendChild(a);
            a.click();
            
            // 保存到我的音乐列表
            const formData = new FormData();
            formData.append('melody', mp3Blob, `collage_${new Date().toISOString().slice(0,10)}.mp3`);
            formData.append('title', `声音拼贴 ${new Date().toLocaleString()}`);
            formData.append('music_type', 'collage');

            const response = await fetch('/save_music/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: formData
            });
            
            if (!response.ok) throw new Error('保存到我的音乐失败');
            
            alert('拼贴音乐已保存并添加到我的音乐！');
            
        } catch (error) {
            console.error('生成失败:', error);
            alert('生成失败: ' + error.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '生成音乐';
        }
    });

    // AudioBuffer转WAV
    function bufferToWav(buffer) {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const bufferOut = new ArrayBuffer(length);
        const view = new DataView(bufferOut);
        
        // 写入WAV头
        const writeString = (pos, str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(pos + i, str.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, length - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numOfChan, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
        view.setUint16(32, numOfChan * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length - 44, true);
        
        // 写入PCM数据
        let pos = 44;
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            const channel = buffer.getChannelData(i);
            for (let j = 0; j < channel.length; j++) {
                const sample = Math.max(-1, Math.min(1, channel[j]));
                view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                pos += 2;
            }
        }
        
        return new Blob([view], { type: 'audio/wav' });
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
});