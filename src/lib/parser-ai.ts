import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function aiParseTitle(rawTitle: string, channelTitle: string): Promise<{
  artist: string;
  song: string;
  confidence: number;
}> {
  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307', // Using stable Haiku model name
    max_tokens: 150,
    system: `You parse YouTube music video titles into artist and song name.
Output ONLY valid JSON: {"artist": "...", "song": "...", "confidence": 0.0-1.0}
Strip noise like (Official Video), (HD), (Live), feat. tags, year tags.
Handle Cyrillic (Ukrainian, Russian), English, and other languages.
If you cannot reliably determine — set confidence below 0.3.`,
    messages: [{
      role: 'user',
      content: `Title: """${rawTitle}"""\nChannel: """${channelTitle}"""`,
    }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from Claude');
  const parsed = JSON.parse(textBlock.text);
  return parsed;
}
