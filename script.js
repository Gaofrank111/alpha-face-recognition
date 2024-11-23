let isModelLoaded = false;
let modelLoadingStatus = '未开始';
const MODEL_URL = 'models'; // 如果模型文件放在本地，改为本地路径

// 加载模型
async function loadModel() {
    try {
        modelLoadingStatus = '正在加载模型...';
        updateLoadingStatus();
        
        // 添加更多模型
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models'),
            faceapi.nets.ageGenderNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models')
        ]);
        
        isModelLoaded = true;
        modelLoadingStatus = '模型加载完成！';
        updateLoadingStatus();
        console.log('模型加载完成');
    } catch (error) {
        modelLoadingStatus = '模型加载失败，请刷新页面重试';
        updateLoadingStatus();
        console.error('模型加载失败:', error);
    }
}

// 页面加载时初始化模型
loadModel();

document.getElementById('image').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        const preview = document.getElementById('preview');
        const loading = document.getElementById('loading');
        
        // 显示图片预览
        const reader = new FileReader();
        reader.onload = async function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            loading.style.display = 'block';
            
            // 等待图片加载完成
            preview.onload = async () => {
                if (!isModelLoaded) {
                    await loadModel();
                }
                await analyzeImage(preview);
                loading.style.display = 'none';
            };
        }
        reader.readAsDataURL(file);
    }
});

async function analyzeImage(imgElement) {
    const resultDiv = document.getElementById('result');
    const name = document.getElementById('name').value || '阿飞';

    try {
        // 确保模型加载完成
        if (!isModelLoaded) {
            resultDiv.innerHTML = '<p>等待模型加载...</p>';
            await loadModel();
        }

        console.log('开始预处理图片...');
        
        // 创建canvas进行图片预处理
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 调整图片大小，保持比例
        const MAX_SIZE = 1024;
        let width = imgElement.naturalWidth;
        let height = imgElement.naturalHeight;
        
        if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
                height = height * (MAX_SIZE / width);
                width = MAX_SIZE;
            } else {
                width = width * (MAX_SIZE / height);
                height = MAX_SIZE;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 在canvas上绘制图片
        ctx.drawImage(imgElement, 0, 0, width, height);
        
        console.log('图片尺寸:', width, 'x', height);
        
        // 使用canvas进行检测
        console.log('开始人脸检测...');
        const detections = await faceapi.detectAllFaces(canvas)
            .withFaceLandmarks()
            .withAgeAndGender();
        
        console.log('检测结果:', detections);

        if (!detections || detections.length === 0) {
            resultDiv.innerHTML = `
                <p>未检测到人脸，请确保：</p>
                <ul>
                    <li>图片中包含清晰的人脸</li>
                    <li>人脸朝向正面</li>
                    <li>光线充足</li>
                </ul>
                <button class="button" onclick="retryAnalysis()">重新尝试</button>`;
            return;
        }

        const face = detections[0];
        const gender = face.gender;
        const genderConfidence = face.genderProbability;
        const age = Math.round(face.age);
        
        console.log('检测详情:', {
            gender,
            genderConfidence,
            age,
            faceBox: face.detection.box
        });
        
        if (gender === 'male' && genderConfidence > 0.6) {
            resultDiv.innerHTML = `
                <p>${name}是一位${age}岁的先生。</p>
                <p><small>(性别置信度: ${(genderConfidence * 100).toFixed(1)}%)</small></p>`;
        } else if (gender === 'female' && genderConfidence > 0.6) {
            resultDiv.innerHTML = `
                <p>${name}是一位${age}岁的女士。</p>
                <p><small>(性别置信度: ${(genderConfidence * 100).toFixed(1)}%)</small></p>`;
        } else {
            resultDiv.innerHTML = `
                <p>无法确定${name}的性别。</p>
                <p><small>(置信度过低: ${(genderConfidence * 100).toFixed(1)}%)</small></p>`;
        }

    } catch (error) {
        console.error('分析错误:', error);
        resultDiv.innerHTML = `
            <p>图片分析出现错误：</p>
            <p><small>${error.message}</small></p>
            <p>请尝试：</p>
            <ul>
                <li>使用其他图片</li>
                <li>确保网络连接正常</li>
                <li>刷新页面重试</li>
            </ul>
            <button class="button" onclick="retryAnalysis()">重新尝试</button>`;
    }
}

function updateLoadingStatus() {
    const loading = document.getElementById('loading');
    loading.textContent = modelLoadingStatus;
}

function retryAnalysis() {
    const preview = document.getElementById('preview');
    if (preview.src) {
        analyzeImage(preview);
    }
} 