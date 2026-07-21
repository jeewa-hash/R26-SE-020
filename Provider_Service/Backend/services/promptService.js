export const buildPrompt = (data) => {

return `
You are a professional advertisement copywriter.

Generate an attractive service advertisement.

SERVICE DETAILS:
Service: ${data.service}
Location: ${data.location}
Price: ${data.price}
Special Offer: ${data.specialOffer}
Tone: ${data.tone}
Contact: ${data.contact}

Requirements:
- Professional wording
- Attractive marketing style
- Include emojis
- Include CTA
- Add hashtags
- Make it suitable for Facebook
- Under 150 words

Return format:

1. Title
2. Caption
3. Hashtags
`;

};