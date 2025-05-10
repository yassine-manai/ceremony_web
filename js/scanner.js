let html5QrCode;
let scanHistory = [];

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if running on HTTPS or localhost
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        showNotification('Camera access requires HTTPS connection', 'error');
        console.error('Camera access requires HTTPS. Current protocol:', window.location.protocol);
    }
    
    html5QrCode = new Html5Qrcode("reader");
    
    // Add camera permission check for iOS
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('Camera API is supported');
    } else {
        console.error('Camera API is not supported in this browser');
        showNotification('Camera not supported in this browser', 'error');
    }
});

async function startScanning() {
    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'inline-flex';
    
    try {
        // First try to get camera permission explicitly
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                // Request camera permission first
                await navigator.mediaDevices.getUserMedia({ video: true });
                console.log('Camera permission granted');
            } catch (permissionError) {
                console.error('Camera permission denied:', permissionError);
                showNotification('Camera permission denied. Please allow camera access.', 'error');
                stopScanning();
                return;
            }
        }
        
        // Get available cameras
        const cameras = await Html5Qrcode.getCameras();
        console.log('Available cameras:', cameras);
        
        if (cameras && cameras.length) {
            // Try to find back camera for mobile
            let cameraId = cameras[0].id;
            
            // Look for back camera
            const backCamera = cameras.find(camera => 
                camera.label.toLowerCase().includes('back') || 
                camera.label.toLowerCase().includes('rear') ||
                camera.label.toLowerCase().includes('environment')
            );
            
            if (backCamera) {
                cameraId = backCamera.id;
                console.log('Using back camera:', backCamera.label);
            } else {
                console.log('Using default camera:', cameras[0].label);
            }
            
            // Start scanning with selected camera
            await html5QrCode.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0 // Square aspect ratio works better on mobile
                },
                onScanSuccess,
                onScanError
            );
            
            console.log('Scanner started successfully');
            
        } else {
            throw new Error('No cameras found');
        }
        
    } catch (err) {
        console.error('Failed to start scanner:', err);
        let errorMessage = 'Failed to start scanner';
        
        // Provide more specific error messages
        if (err.name === 'NotAllowedError') {
            errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
            errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
            errorMessage = 'Camera is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
            errorMessage = 'Camera settings not supported.';
        } else if (err.name === 'SecurityError') {
            errorMessage = 'Camera access requires HTTPS connection.';
        }
        
        showNotification(errorMessage, 'error');
        
        // Display detailed error in the result box
        const resultBox = document.getElementById('scanResult');
        resultBox.className = 'result-box error';
        resultBox.innerHTML = `
            <h3>Camera Error</h3>
            <p>${errorMessage}</p>
            <p><small>Error details: ${err.message || err}</small></p>
            <div style="margin-top: 1rem;">
                <h4>Troubleshooting:</h4>
                <ul style="text-align: left; margin: 0.5rem 0;">
                    <li>Make sure you're accessing via HTTPS</li>
                    <li>Allow camera permissions when prompted</li>
                    <li>Check if camera is being used by another app</li>
                    <li>Try refreshing the page</li>
                </ul>
            </div>
        `;
        
        stopScanning();
    }
}

async function stopScanning() {
    try {
        await html5QrCode.stop();
        console.log('Scanner stopped successfully');
    } catch (err) {
        console.error('Failed to stop scanner:', err);
    } finally {
        document.getElementById('startScanBtn').style.display = 'inline-flex';
        document.getElementById('stopScanBtn').style.display = 'none';
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    console.log('QR code detected:', decodedText);
    
    // Stop scanning after successful read
    await stopScanning();
    
    // Process the QR code
    try {
        const response = await api.post('/scan', { qr_data: decodedText });
        
        const resultBox = document.getElementById('scanResult');
        resultBox.className = 'result-box ' + (response.success ? 'success' : 'error');
        
        resultBox.innerHTML = `
            <h3>${response.success ? 'Success!' : 'Error'}</h3>
            <p>${response.message}</p>
            <p>QR Code: ${decodedText}</p>
        `;
        
        // Add to history
        addToHistory(decodedText, response.success);
        
        // Show notification
        showNotification(response.message, response.success ? 'success' : 'error');
        
    } catch (error) {
        console.error('API error:', error);
        const resultBox = document.getElementById('scanResult');
        resultBox.className = 'result-box error';
        resultBox.innerHTML = `
            <h3>Error</h3>
            <p>Failed to process QR code</p>
            <p><small>${error.message}</small></p>
        `;
        showNotification('Failed to process QR code', 'error');
    }
}

function onScanError(errorMessage) {
    // Handle scan error silently
    // Errors happen often when scanning, only log for debugging
    // console.log('Scan error:', errorMessage);
}

function addToHistory(qrData, success) {
    const historyItem = {
        qrData,
        success,
        timestamp: new Date().toLocaleString()
    };
    
    scanHistory.unshift(historyItem);
    
    // Keep only last 10 items
    if (scanHistory.length > 10) {
        scanHistory.pop();
    }
    
    displayHistory();
}

function displayHistory() {
    const historyContainer = document.getElementById('scanHistory');
    historyContainer.innerHTML = '';
    
    if (scanHistory.length === 0) {
        historyContainer.innerHTML = '<p style="color: #94a3b8;">No scan history yet</p>';
        return;
    }
    
    scanHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div>
                <strong>${item.qrData}</strong>
                <br>
                <small>${item.timestamp}</small>
            </div>
            <span class="status-badge ${item.success ? 'scanned' : 'error'}">
                ${item.success ? 'Success' : 'Failed'}
            </span>
        `;
        historyContainer.appendChild(historyItem);
    });
}

// Add this function to test camera access
async function testCameraAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('Camera test successful');
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (err) {
        console.error('Camera test failed:', err);
        return false;
    }
}