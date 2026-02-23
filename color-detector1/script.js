document.addEventListener('DOMContentLoaded', () => {

    // --- A simple, self-contained color naming function ---
    function getColorName(rgb) {
        const colors = [
            { name: 'Black', rgb: { r: 0, g: 0, b: 0 } },
            { name: 'White', rgb: { r: 255, g: 255, b: 255 } },
            { name: 'Red', rgb: { r: 255, g: 0, b: 0 } },
            { name: 'Green', rgb: { r: 0, g: 255, b: 0 } },
            { name: 'Blue', rgb: { r: 0, g: 0, b: 255 } },
            { name: 'Yellow', rgb: { r: 255, g: 255, b: 0 } },
            { name: 'Cyan', rgb: { r: 0, g: 255, b: 255 } },
            { name: 'Magenta', rgb: { r: 255, g: 0, b: 255 } },
            { name: 'Silver', rgb: { r: 192, g: 192, b: 192 } },
            { name: 'Gray', rgb: { r: 128, g: 128, b: 128 } },
            { name: 'Maroon', rgb: { r: 128, g: 0, b: 0 } },
            { name: 'Olive', rgb: { r: 128, g: 128, b: 0 } },
            { name: 'Purple', rgb: { r: 128, g: 0, b: 128 } },
            { name: 'Teal', rgb: { r: 0, g: 128, b: 128 } },
            { name: 'Navy', rgb: { r: 0, g: 0, b: 128 } },
            { name: 'Orange', rgb: { r: 255, g: 165, b: 0 } },
            { name: 'Pink', rgb: { r: 255, g: 192, b: 203 } },
            { name: 'Brown', rgb: { r: 165, g: 42, b: 42 } },
        ];

        let minDistance = Infinity;
        let closestColorName = 'Unknown';

        for (const color of colors) {
            const distance = Math.sqrt(
                Math.pow(rgb.r - color.rgb.r, 2) +
                Math.pow(rgb.g - color.rgb.g, 2) +
                Math.pow(rgb.b - color.rgb.b, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestColorName = color.name;
            }
        }
        return closestColorName;
    }

    // Get references to HTML elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const toggleCameraBtn = document.getElementById('toggleCamera');
    const detectFromCameraBtn = document.getElementById('detectFromCamera');
    const imageUploadInput = document.getElementById('imageUpload');
    const detectFromUploadBtn = document.getElementById('detectFromUpload');
    const colorPaletteDiv = document.getElementById('colorPalette');
    const uploadChooseBtn = document.querySelector('.btn-choose'); // The label acting as a button

    let stream = null; // To hold the video stream

    // --- Camera Toggle Logic ---
    toggleCameraBtn.addEventListener('click', async () => {
        if (stream) {
            // --- TURN CAMERA OFF ---
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            stream = null;
            toggleCameraBtn.textContent = "Start Camera";
            // Re-enable upload functionality
            imageUploadInput.disabled = false;
            uploadChooseBtn.style.opacity = '1';
            uploadChooseBtn.style.cursor = 'pointer';
        } else {
            // --- TURN CAMERA ON ---
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                toggleCameraBtn.textContent = "Stop Camera";
                // Disable upload functionality while camera is active
                imageUploadInput.disabled = true;
                uploadChooseBtn.style.opacity = '0.5';
                uploadChooseBtn.style.cursor = 'not-allowed';
            } catch (err) {
                console.error("Error accessing camera: ", err);
                alert("Could not access the camera. Please ensure you have granted permissions.");
            }
        }
    });

    // --- Image Upload Logic (Separate Choose and Detect) ---
    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            // Update the "Choose File" button text to show the filename
            uploadChooseBtn.textContent = file.name;
        } else {
            // Reset the button text if no file is selected
            uploadChooseBtn.textContent = 'Choose File';
        }
    });

    detectFromUploadBtn.addEventListener('click', () => {
        const file = imageUploadInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const palette = getColorPalette(img);
                    updateUI(palette);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert("Please choose an image file first.");
        }
    });

    // --- Color Palette Detection Logic ---
    function getColorPalette(imageSource) {
        if (imageSource instanceof HTMLVideoElement) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        } else if (imageSource instanceof HTMLImageElement) {
            canvas.width = imageSource.naturalWidth;
            canvas.height = imageSource.naturalHeight;
        }

        context.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const colorMap = {};
        let totalPixels = 0;

        for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 128) continue;

            const quantizedR = Math.floor(r / 32) * 32;
            const quantizedG = Math.floor(g / 32) * 32;
            const quantizedB = Math.floor(b / 32) * 32;
            const key = `${quantizedR},${quantizedG},${quantizedB}`;

            if (!colorMap[key]) {
                colorMap[key] = { count: 0, r: 0, g: 0, b: 0 };
            }
            colorMap[key].count++;
            colorMap[key].r += r;
            colorMap[key].g += g;
            colorMap[key].b += b;
            totalPixels++;
        }

        let sortedColors = Object.keys(colorMap).map(key => {
            const color = colorMap[key];
            const avgR = Math.round(color.r / color.count);
            const avgG = Math.round(color.g / color.count);
            const avgB = Math.round(color.b / color.count);
            return {
                rgb: { r: avgR, g: avgG, b: avgB },
                count: color.count,
                percentage: (color.count / totalPixels * 100).toFixed(2)
            };
        }).sort((a, b) => b.count - a.count);

        return sortedColors.slice(0, 10);
    }

    function updateUI(colorPalette) {
        colorPaletteDiv.innerHTML = '';

        if (colorPalette.length === 0) {
            colorPaletteDiv.innerHTML = '<p class="placeholder">Could not detect any colors.</p>';
            return;
        }

        colorPalette.forEach(colorData => {
            const { r, g, b } = colorData.rgb;
            const hexString = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            const colorName = getColorName({ r, g, b });

            const swatchDiv = document.createElement('div');
            swatchDiv.className = 'color-swatch';

            swatchDiv.innerHTML = `
                <div class="color-sample" style="background-color: rgb(${r}, ${g}, ${b})"></div>
                <div class="color-info">
                    <div class="name">${colorName}</div>
                    <div class="hex">${hexString}</div>
                    <div class="percentage">${colorData.percentage}%</div>
                </div>
            `;
            colorPaletteDiv.appendChild(swatchDiv);
        });
    }

    // --- Event Listener for Camera Detection ---
    detectFromCameraBtn.addEventListener('click', () => {
        if (stream) {
            const palette = getColorPalette(video);
            updateUI(palette);
        } else {
            alert("Please start the camera first.");
        }
    });
});