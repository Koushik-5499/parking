document.addEventListener('DOMContentLoaded', () => {
    // Get booking data from localStorage
    const bookingDataStr = localStorage.getItem('bookingData');
    
    if (!bookingDataStr) {
        alert('No booking data found');
        window.location.href = 'location.html';
        return;
    }

    const bookingData = JSON.parse(bookingDataStr);

    // Display booking details
    document.getElementById('bookingIdDisplay').textContent = bookingData.bookingId.substring(0, 8);
    document.getElementById('slotNumber').textContent = bookingData.slotNumber;
    document.getElementById('location').textContent = bookingData.location;
    document.getElementById('name').textContent = bookingData.name;
    document.getElementById('phone').textContent = bookingData.phone;
    document.getElementById('vehicleNumber').textContent = bookingData.vehicleNumber;
    document.getElementById('vehicleType').textContent = bookingData.vehicleType;
    document.getElementById('price').textContent = `₹${bookingData.price}`;

    // Generate QR code
    const qrData = `${bookingData.bookingId}_${bookingData.slotNumber}_${bookingData.location}_${bookingData.vehicleNumber}`;
    
    new QRCode(document.getElementById("qrcode"), {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Clear booking data from localStorage after displaying
    // (Keep it for now so user can return to this page)
});
