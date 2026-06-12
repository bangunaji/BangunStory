export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { systemPrompt, userContext, mode, length } = req.body;

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "NVIDIA_API_KEY is not configured on the server." });
    }

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext }
        ],
        temperature: mode === 'brainstorm' ? 0.9 : 0.8,
        max_tokens: length === 'short' ? 250 : 600,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA API Error:", errorText);
      return res.status(response.status).json({ error: "Failed to generate AI response." });
    }

    const data = await response.json();
    return res.status(200).json({ result: data.choices[0].message.content });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
}
