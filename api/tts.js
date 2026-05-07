export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: 'shimmer', // Professional female voice
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'OpenAI TTS Error');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');

        res.status(200).json({ audio: `data:audio/mp3;base64,${base64Audio}` });
    } catch (error) {
        console.error('TTS API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
