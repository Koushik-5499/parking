export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userMessage, parkingContext } = req.body;

    if (!userMessage) {
        return res.status(400).json({ error: 'Missing user message' });
    }

    // Access the API key securely from Vercel environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not configured in Vercel Environment Variables");
        return res.status(500).json({ error: 'API key is not configured' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // System instruction defining the FASTPARK AI assistant
    const systemInstruction = `You are FASTPARK AI assistant.
Help users find parking slots, booking information, traffic updates, parking costs, directions, and emergency parking support.
Reply shortly, professionally, and clearly.
Support Tamil and English mixed conversation.

Here is the current real-time parking data to use if the user asks about availability:
${parkingContext || 'Not available'}

Parking rules & info:
- Cost: ₹80 per hour
- Payment: Online (Razorpay/UPI) or Cash at exit
- You can say "book slot" to initiate a booking flow.
- "📍 Direction" button on the location cards opens Google Maps.`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: userMessage }]
            }
        ],
        systemInstruction: {
            role: "user",
            parts: [{ text: systemInstruction }]
        },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
        }
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error Details:", errorText);
            return res.status(response.status).json({ error: 'Error communicating with Google AI' });
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
            return res.status(200).json({ 
                reply: data.candidates[0].content.parts[0].text.trim() 
            });
        } else {
            console.error("Invalid response format:", data);
            return res.status(500).json({ error: "Invalid response format from Gemini API" });
        }
    } catch (error) {
        console.error("Gemma API Request Failed:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
