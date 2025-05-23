// 替换整个文件内容
document.addEventListener('DOMContentLoaded', function() {
    const micSettingsBtn = document.getElementById('mic-settings');
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const playbackBtn = document.getElementById('playback-btn');
    const audioPlayback = document.getElementById('audio-playback');
    const micStatus = document.getElementById('mic-status');
    const submitBtn = document.querySelector('.btn-submit');
    const audioFileInput = document.getElementById('audio-file');
    
    let mediaRecorder;
    let audioChunks = [];
    let audioStream;

    // 麦克风设置
    micSettingsBtn.addEventListener('click', async function() {
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // 测试麦克风
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(audioStream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            
            micStatus.textContent = "麦克风正常";
            micStatus.className = "mic-status mic-active";
            
            // 关闭测试连接
            setTimeout(() => {
                source.disconnect();
                audioStream.getTracks().forEach(track => track.stop());
            }, 1000);
            
        } catch (error) {
            console.error('麦克风错误:', error);
            micStatus.textContent = "麦克风访问失败: " + error.message;
            micStatus.className = "mic-status mic-error";
        }
    });

    // 开始录音
    recordBtn.addEventListener('click', async function() {
        try {
            audioChunks = [];
            recordBtn.disabled = true;
            stopBtn.disabled = false;
            playbackBtn.disabled = true;
            submitBtn.disabled = true;
            
            audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            mediaRecorder = new MediaRecorder(audioStream);
            
            mediaRecorder.ondataavailable = function(e) {
                audioChunks.push(e.data);
            };
            
            mediaRecorder.onstop = function() {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                audioPlayback.src = audioUrl;
                playbackBtn.disabled = false;
                
                // 准备MP3文件用于提交
                convertToMP3(audioBlob).then(mp3Blob => {
                    const mp3File = new File([mp3Blob], 'recording.mp3', { type: 'audio/mp3' });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(mp3File);
                    audioFileInput.files = dataTransfer.files;
                    submitBtn.disabled = false;
                });
            };
            
            mediaRecorder.start();
            micStatus.textContent = "录音中...";
            micStatus.className = "mic-status mic-active";
            
        } catch (error) {
            console.error('录音错误:', error);
            micStatus.textContent = "录音失败: " + error.message;
            micStatus.className = "mic-status mic-error";
            recordBtn.disabled = false;
            stopBtn.disabled = true;
        }
    });

    // 停止录音
    stopBtn.addEventListener('click', function() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            audioStream.getTracks().forEach(track => track.stop());
            micStatus.textContent = "录音完成";
        }
    });

    // 试听录音
    playbackBtn.addEventListener('click', function() {
        audioPlayback.play();
    });

    // WAV转MP3
    async function convertToMP3(wavBlob) {
        return new Promise((resolve) => {
            const mp3Encoder = new lamejs.Mp3Encoder(1, 44100, 128);
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const wavData = new Int16Array(e.target.result);
                const mp3Data = mp3Encoder.encodeBuffer(wavData);
                const mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' });
                resolve(mp3Blob);
            };
            
            reader.readAsArrayBuffer(wavBlob);
        });
    }
});