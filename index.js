require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Anthropic Init
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/analyze-resume', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    const prompt = `
You are an expert AI resume reviewer. 
Analyze the provided resume text and return structured, actionable feedback formatted strictly as a JSON object with the following keys:
- "tone": A brief evaluation of the tone (e.g., professional, weak, strong).
- "keyword_gaps": An array of strings describing missing skills or keywords.
- "content_improvements": An array of strings suggesting improvements for bullet points or sections.
- "formatting_issues": An array of strings highlighting formatting or readability issues.

Resume Text:
${text}

Output ONLY valid JSON.
`;

    const msg = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.2,
      system: "You are a specialized AI designed to review resumes. Always output your findings in strict JSON format without any markdown wrappers or additional text.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    let jsonResponse;
    const rawText = msg.content[0].text;
    
    try {
      jsonResponse = JSON.parse(rawText);
    } catch (parseError) {
      // Sometimes the model outputs markdown wrapped json despite the prompt
      const jsonMatch = rawText.match(/```json\n([\s\S]*)\n```/);
      if (jsonMatch && jsonMatch[1]) {
         jsonResponse = JSON.parse(jsonMatch[1]);
      } else {
         throw new Error("Failed to parse JSON from AI response.");
      }
    }

    res.json(jsonResponse);
  } catch (error) {
    console.error('Claude API Error:', error);
    res.status(500).json({ error: 'Failed to analyze resume.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
