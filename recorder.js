document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const playBtn = document.getElementById('playBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusText = document.getElementById('statusText');
    const waveform = document.getElementById('waveform');
    
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob;
    let audioUrl;
    let audioContext;
    let analyser;
    let canvasCtx = waveform.getContext('2d');
    let animationId;
    
    // 初始化音频上下文
    function initAudioContext() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
    }
    
    // 绘制波形
    function drawWaveform() {
        animationId = requestAnimationFrame(drawWaveform);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        
        canvasCtx.fillStyle = 'rgb(200, 200, 200)';
        canvasCtx.fillRect(0, 0, waveform.width, waveform.height);
        
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
        canvasCtx.beginPath();
        
        const sliceWidth = waveform.width * 1.0 / bufferLength;
        let x = 0;
        
        for(let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * waveform.height / 2;
            
            if(i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        canvasCtx.lineTo(waveform.width, waveform.height/2);
        canvasCtx.stroke();
    }
    
    // 开始录音
    startBtn.addEventListener('click', async function() {
        try {
            statusText.textContent = "请求麦克风权限...";
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            initAudioContext();
            
            mediaRecorder = new MediaRecorder(stream);
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            
            mediaRecorder.addEventListener('dataavailable', function(event) {
                audioChunks.push(event.data);
            });
            
            mediaRecorder.addEventListener('stop', function() {
                audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioUrl = URL.createObjectURL(audioBlob);
                
                playBtn.disabled = false;
                downloadBtn.disabled = false;
                statusText.textContent = "录音完成! 可以播放或下载";
                
                // 停止波形绘制
                cancelAnimationFrame(animationId);
                canvasCtx.clearRect(0, 0, waveform.width, waveform.height);
            });
            
            mediaRecorder.start();
            startBtn.disabled = true;
            stopBtn.disabled = false;
            statusText.textContent = "正在录音...";
            
            // 开始绘制波形
            drawWaveform();
            
            audioChunks = [];
        } catch (error) {
            statusText.textContent = "错误: " + error.message;
            console.error("录音错误:", error);
        }
    });
    
    // 停止录音
    stopBtn.addEventListener('click', function() {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });
    
    // 播放录音
    playBtn.addEventListener('click', function() {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play();
            statusText.textContent = "正在播放录音...";
            
            audio.addEventListener('ended', function() {
                statusText.textContent = "播放结束";
            });
        }
    });
    
    // 下载录音
    downloadBtn.addEventListener('click', function() {
        if (audioBlob) {
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = audioUrl;
            a.download = 'recording_' + new Date().toISOString().slice(0, 19) + '.wav';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(audioUrl);
            }, 100);
            
            statusText.textContent = "录音已下载";
        }
    });
    
    // 检测浏览器兼容性
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusText.textContent = "您的浏览器不支持录音功能，请使用最新版Chrome、Firefox或Edge";
        startBtn.disabled = true;
    }
});