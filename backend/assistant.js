const { OpenAI } = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

const assistantService = {
  async checkConcepts(content) {
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

    return { detectedConcept };
  },

  async getExplanation(concept) {
    const explanationResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful teaching assistant. Provide a concise, engaging explanation of ${concept.name} in the context of ${concept.category}.`
        }
      ]
    });
    return { response: explanationResponse.choices[0].message.content };
  },

  async getPracticeQuestion(concept) {
    const questionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Create a practice question about ${concept.name} in ${concept.category}. Include the answer.`
        }
      ]
    });
    return { response: questionResponse.choices[0].message.content };
  }
};

module.exports = assistantService; 