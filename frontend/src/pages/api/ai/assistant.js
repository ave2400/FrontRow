import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Concept bank with embeddings
const conceptBank = {
  finance: {
    CAPM: {
      embedding: null,
      prompt: "Do you want a 1-min breakdown of CAPM? Here's a quick example!"
    },
    "Time Value of Money": {
      embedding: null,
      prompt: "Need help understanding Time Value of Money? I can break it down for you!"
    },
    "Compound Interest": {
      embedding: null,
      prompt: "Want to understand how compound interest works? Let me explain!"
    }
  },
  biology: {
    mitochondria: {
      embedding: null,
      prompt: "Need a refresher on what mitochondria do? Want an analogy?"
    },
    "DNA Replication": {
      embedding: null,
      prompt: "Confused about DNA replication? I can help explain the process!"
    },
    "Cell Division": {
      embedding: null,
      prompt: "Want to understand mitosis and meiosis? Let me break it down!"
    }
  },
  computerScience: {
    "Binary Search": {
      embedding: null,
      prompt: "Need help understanding binary search? I can explain with examples!"
    },
    "Recursion": {
      embedding: null,
      prompt: "Struggling with recursion? Let me help you understand it better!"
    },
    "Big O Notation": {
      embedding: null,
      prompt: "Want to understand time complexity and Big O? I can explain!"
    }
  }
};

// Function to calculate cosine similarity
const cosineSimilarity = (a, b) => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, content, concept } = req.body;

    switch (action) {
      case 'getEmbedding':
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: content,
        });
        return res.status(200).json({ embedding: embeddingResponse.data[0].embedding });

      case 'checkConcepts':
        const noteEmbedding = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: content,
        });

        let maxSimilarity = 0;
        let detectedConcept = null;

        // Check against all concepts in the bank
        for (const category in conceptBank) {
          for (const concept in conceptBank[category]) {
            if (!conceptBank[category][concept].embedding) {
              // Get embedding if not already stored
              const conceptEmbedding = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: concept,
              });
              conceptBank[category][concept].embedding = conceptEmbedding.data[0].embedding;
            }

            const similarity = cosineSimilarity(
              noteEmbedding.data[0].embedding,
              conceptBank[category][concept].embedding
            );

            if (similarity > maxSimilarity && similarity > 0.8) {
              maxSimilarity = similarity;
              detectedConcept = {
                name: concept,
                category: category,
                prompt: conceptBank[category][concept].prompt
              };
            }
          }
        }

        return res.status(200).json({ detectedConcept });

      case 'getExplanation':
        const explanationResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a helpful teaching assistant. Provide a concise, engaging explanation of ${concept.name} in the context of ${concept.category}.`
            }
          ]
        });
        return res.status(200).json({ response: explanationResponse.choices[0].message.content });

      case 'getPracticeQuestion':
        const questionResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `Create a practice question about ${concept.name} in ${concept.category}. Include the answer.`
            }
          ]
        });
        return res.status(200).json({ response: questionResponse.choices[0].message.content });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error in AI assistant API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 