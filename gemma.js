// gemma.js


/**
 * Fetches response from the secure Vercel backend API
 * @param {string} userMessage - The message from the user
 * @param {string} parkingContext - Current real-time parking data to give AI context
 * @returns {Promise<string>} The AI's response text
 */
export async function getGemmaResponse(userMessage, parkingContext) {
    try {
        const response = await fetch('/api/chat', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userMessage,
                parkingContext
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Backend API Error Details:", errorData);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.reply) {
            return data.reply;
        } else {
            throw new Error("Invalid response format from Backend API");
        }
    } catch (error) {
        console.error("Chat Request Failed:", error);
        throw error;
    }
}
