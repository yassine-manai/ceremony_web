// Load students when page loads
document.addEventListener('DOMContentLoaded', loadStudents);

async function loadStudents() {
    try {
        const students = await api.get('/students');
        displayStudents(students);
        updateStats(students);
    } catch (error) {
        showNotification('Failed to load students', 'error');
    }
}

function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${student.card_number}</td>
            <td>
                <span class="status-badge ${student.qr_code_status ? 'scanned' : 'pending'}">
                    ${student.qr_code_status ? 'Scanned' : 'Pending'}
                </span>
            </td>
            <td>${formatDate(student.created_at)}</td>
            <td>
                <button class="btn btn-secondary" onclick="viewQRCode('${student.id}', '${student.name}', '${student.qr_code}')">
                    View QR
                </button>
                <button class="btn btn-primary" onclick="regenerateQR('${student.id}')">
                    Regenerate
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateStats(students) {
    const totalStudents = students.length;
    const scannedQRs = students.filter(s => s.qr_code_status).length;
    const pendingQRs = totalStudents - scannedQRs;

    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('scannedQRs').textContent = scannedQRs;
    document.getElementById('pendingQRs').textContent = pendingQRs;
}

// Modal functions
function showAddStudentModal() {
    document.getElementById('addStudentModal').classList.add('active');
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').classList.remove('active');
    document.getElementById('addStudentForm').reset();
}

async function addStudent(event) {
    event.preventDefault();
    
    const studentData = {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        card_number: document.getElementById('cardNumber').value
    };

    try {
        await api.post('/students', studentData);
        showNotification('Student added successfully');
        closeAddStudentModal();
        loadStudents();
    } catch (error) {
        showNotification('Failed to add student', 'error');
    }
}

function viewQRCode(studentId, studentName, qrCode) {
    document.getElementById('qrCodeModal').classList.add('active');
    document.getElementById('qrCodeImage').src = `data:image/png;base64,${qrCode}`;
    document.getElementById('qrStudentName').textContent = studentName;
}

function closeQRModal() {
    document.getElementById('qrCodeModal').classList.remove('active');
}

async function regenerateQR(studentId) {
    try {
        const response = await api.post(`/regenerate/${studentId}`, {});
        if (response.success) {
            showNotification('QR code regenerated successfully');
            loadStudents();
        }
    } catch (error) {
        showNotification('Failed to regenerate QR code', 'error');
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}