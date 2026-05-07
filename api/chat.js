export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, parkingData } = req.body;
        
        const systemPrompt = `You are FASTPARK, an advanced AI parking receptionist. You help users with slot booking, billing, navigation, and parking assistance.
You must respond naturally in the language the user speaks (English, Tamil, or Hindi).
Your personality: Professional, human-like, very brief, polite.
Current Parking Status: ${JSON.stringify(parkingData || {})}

Instructions for specific intents:
1. If the user wants to book a slot, reply naturally and append exactly "[ACTION_BOOK]" at the end of your message.
2. If the user asks for navigation/directions, reply naturally (e.g., "Navigation started") and append exactly "[ACTION_NAVIGATE]" at the end.
3. If the user asks to play the simulator/game, reply naturally and append exactly "[ACTION_SIMULATOR]".
4. If the user asks for billing or price, inform them it is ₹80 per hour.
5. If the user asks for available slots, check the Current Parking Status and tell them exactly how many are free.

Keep your spoken response to 1-2 short sentences. Example: "Slot A12 is available sir."`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 150,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'OpenAI Error');
        }

        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
