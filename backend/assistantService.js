const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Concept Bank Initialization
let conceptBank = {}; // will be populated with pre-computed embeddings
let isConceptBankInitialized = false;

async function loadConceptBank() {
  const embeddingsFilePath = path.join(__dirname, 'conceptEmbeddings.json');
  try {
    if (fs.existsSync(embeddingsFilePath)) {
      console.log("Loading pre-computed embeddings...");
      const data = fs.readFileSync(embeddingsFilePath, 'utf-8');
      conceptBank = JSON.parse(data);
      // Basic validation of loaded structure
      if (Object.keys(conceptBank).length === 0) {
          console.warn("Loaded concept bank is empty. Check conceptEmbeddings.json.");
      } else {
        // Log how many concepts were loaded per category
        for (const category in conceptBank) {
            console.log(`  Loaded ${Object.keys(conceptBank[category]).length} concepts for ${category}`);
        }
      }
      console.log("Pre-computed embeddings loaded.");
    } else {
      console.error(`Error: Pre-computed embeddings file not found at ${embeddingsFilePath}`);
      // NOTE: If you are getting this error, you need to run `node generate_embeddings.js` in ur backend first
      // Running that will generate the conceptEmbeddings.json file
      console.log("Please run the `generate_embeddings.js` script first.");
      // Fallback to an empty structure to prevent runtime errors deeper in the code
      conceptBank = { finance: {}, biology: {}, computerScience: {}, history: {}, math: {}, philosophy: {}, literature: {}, psychology: {}, art: {} };
    }
  } catch (error) {
    console.error("Error loading concept bank from file:", error);
    conceptBank = { finance: {}, biology: {}, computerScience: {}, history: {}, math: {}, philosophy: {}, literature: {}, psychology: {}, art: {} }; // Fallback
  }
  isConceptBankInitialized = true;
}

// Function to ensure the concept bank is loaded before service methods are used
// This should be called once when your server starts
async function ensureConceptBankInitialized() {
    if (!isConceptBankInitialized) {
        await loadConceptBank();
    }
}

// Function to calculate cosine similarity
const cosineSimilarity = (a, b) => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// State for Cooldown
const recentlyTriggeredConcepts = new Map(); // this will store { conceptName: timestamp }
const CONCEPT_COOLDOWN_MS = 30000; // this equals 30 seconds cooldown

const assistantService = {
  async checkConcepts(content, { lastContent = "", forceRetriggerConcept = null } = {}) {
    await ensureConceptBankInitialized();

    if (!content || content.trim() === "") {
      return { detectedConcept: null };
    }

    let textToAnalyze = content;
    // Basic strategy: if new content is added, focus on the newer part.
    // A more sophisticated approach might use sentence tokenization.
    if (content.length > lastContent.length && content.startsWith(lastContent)) {
        const newText = content.substring(lastContent.length);
        // Analyze a window: the new text plus some preceding context.
        const contextChars = 50; // Number of chars of old content to include
        const relevantOldTextStart = Math.max(0, lastContent.length - contextChars);
        textToAnalyze = lastContent.substring(relevantOldTextStart) + newText;
    } else if (content.length < lastContent.length) {
        // Content was deleted. Analyze the current (shorter) content.
        textToAnalyze = content;
    }
    // If content changed drastically not by appending/deleting from end, analyze all.


    let noteEmbedding;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: textToAnalyze,
      });
      noteEmbedding = embeddingResponse.data[0].embedding;
    } catch (error) {
      console.error("Error getting embedding for content:", error);
      return { detectedConcept: null };
    }

    let maxSimilarity = 0;
    let detectedConcept = null;
    const SIMILARITY_THRESHOLD = 0.8; // Adjust as needed

    const now = Date.now();

    for (const category in conceptBank) {
      for (const conceptName in conceptBank[category]) {
        const conceptData = conceptBank[category][conceptName];
        if (!conceptData || !conceptData.embedding) {
          // console.warn(`Concept data or embedding missing for ${conceptName} in ${category}. Skipping.`);
          continue;
        }

        // Cooldown check: Skip if recently triggered, unless forced
        if (conceptName !== forceRetriggerConcept && recentlyTriggeredConcepts.has(conceptName)) {
          if ((now - recentlyTriggeredConcepts.get(conceptName)) < CONCEPT_COOLDOWN_MS) {
            // console.log(`Concept '${conceptName}' is in cooldown. Skipping.`);
            continue;
          } else {
            recentlyTriggeredConcepts.delete(conceptName); // Cooldown expired
          }
        }

        const similarity = cosineSimilarity(
          noteEmbedding,
          conceptData.embedding
        );

        if (similarity > maxSimilarity && similarity > SIMILARITY_THRESHOLD) {
          maxSimilarity = similarity;
          detectedConcept = {
            name: conceptName,
            category: category,
            prompt: conceptData.prompt,
            similarity: similarity
          };
        }
      }
    }

    if (detectedConcept) {
      // If a concept is detected, mark it as triggered for cooldown (unless it was forced)
      // The actual "triggering" (showing UI) should happen on the client,
      // but for simplicity, we can manage the timestamp here after detection.
    }

    return { detectedConcept };
  },

  markConceptAsShown(conceptName) {
    if (conceptName) {
        console.log(`Marking concept '${conceptName}' as shown/triggered for cooldown.`);
        recentlyTriggeredConcepts.set(conceptName, Date.now());

        // Optional: Clean up very old entries from the map to prevent unbounded growth
        const cutoff = Date.now() - (CONCEPT_COOLDOWN_MS * 10); // e.g., 10x cooldown period
        for (const [key, value] of recentlyTriggeredConcepts.entries()) {
            if (value < cutoff) {
                recentlyTriggeredConcepts.delete(key);
            }
        }
    }
  },

  async getImageSummary(imageUrl) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Please provide a detailed summary of this image. Focus on describing what you see, any text or diagrams present, and the main subject matter. Be specific and thorough in your description." 
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error("Invalid response format from OpenAI");
      }

      return { response: response.choices[0].message.content };
    } catch (error) {
      console.error("Error getting image summary:", error);
      return { response: "Sorry, I couldn't analyze the image at this time. Please make sure the image is clear and try again." };
    }
  },

  async getExplanation(concept) {
    // No changes needed here, but ensure concept is valid
    if (!concept || !concept.name || !concept.category) {
        return { response: "Invalid concept provided for explanation." };
    }
    const explanationResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful teaching assistant. Provide a concise, engaging explanation of "${concept.name}" in the context of ${concept.category}.`
        }
      ]
    });
    return { response: explanationResponse.choices[0].message.content };
  },

  async getPracticeQuestion(concept) {
    if (!concept || !concept.name || !concept.category) {
        return { response: "Invalid concept provided for practice question." };
    }
    const questionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Create a practice question about "${concept.name}" in the context of ${concept.category}. Include the answer clearly separated (e.g., "Answer: ...").`
        }
      ]
    });
    return { response: questionResponse.choices[0].message.content };
  }
};

// Export a function that ensures initialization is complete before returning the service.
// This is good practice if the module might be imported and used immediately.
async function getInitializedAssistantService() {
    await ensureConceptBankInitialized();
    return assistantService;
}

module.exports = getInitializedAssistantService;