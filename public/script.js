function sendLocation(payload) {
    fetch('/api/log', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
}

function fallbackToIP() {
    sendLocation({ geolocation_allowed: false });
}

if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            sendLocation({
                geolocation_allowed: true,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
            });
        },
        () => fallbackToIP(),
        { enableHighAccuracy: true, timeout: 5000 }
    );
} else {
    fallbackToIP();
}
