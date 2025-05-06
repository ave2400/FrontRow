require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Ensure OPENAI_API_KEY is set in your environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set.");
    process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conceptsFilePath = path.join(__dirname, 'concepts.json');
const embeddingsFilePath = path.join(__dirname, 'conceptEmbeddings.json');

async function generateAndSaveEmbeddings() {
  let rawConceptBank;
  try {
    rawConceptBank = JSON.parse(fs.readFileSync(conceptsFilePath, 'utf-8'));
  } catch (error) {
    console.error(`Error reading concepts file (${conceptsFilePath}):`, error);
    return;
  }

  const conceptBankWithEmbeddings = {};
  console.log("Starting embedding generation...");

  for (const category in rawConceptBank) {
    conceptBankWithEmbeddings[category] = {};
    console.log(`Processing category: ${category}`);
    for (const conceptName in rawConceptBank[category]) {
      console.log(`  Embedding: ${conceptName}`);
      try {
        // Ensure conceptName is a non-empty string
        if (typeof conceptName !== 'string' || conceptName.trim() === '') {
            console.warn(`  Skipping invalid concept name: ${conceptName}`);
            continue;
        }
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: conceptName, // Embed the concept name itself
        });
        if (embeddingResponse.data && embeddingResponse.data.length > 0 && embeddingResponse.data[0].embedding) {
            conceptBankWithEmbeddings[category][conceptName] = {
              embedding: embeddingResponse.data[0].embedding,
              prompt: rawConceptBank[category][conceptName].prompt
            };
        } else {
            console.warn(`  No embedding data returned for ${conceptName}. Response:`, embeddingResponse);
        }
      } catch (error) {
        console.error(`  Failed to get embedding for ${conceptName}:`, error.message);
        // Optionally, decide if you want to skip or retry, or log more details
        if (error.response) {
            console.error('  Error details (status):', error.response.status);
            console.error('  Error details (data):', error.response.data);
        }
      }
    }
  }

  try {
    fs.writeFileSync(embeddingsFilePath, JSON.stringify(conceptBankWithEmbeddings, null, 2));
    console.log(`Concept embeddings successfully generated and saved to ${embeddingsFilePath}`);
  } catch (error) {
    console.error(`Error writing embeddings file (${embeddingsFilePath}):`, error);
  }
}

generateAndSaveEmbeddings();