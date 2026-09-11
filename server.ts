import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

// Support large payloads for scanned bank statements & PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy-initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in the environment');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Bank Statement Extraction API
app.post('/api/extract-bank-statement', async (req, res) => {
  try {
    const { fileBase64, mimeType, defaultAccountNo } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({
        error: 'Missing fileBase64 or mimeType in request body',
      });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert institutional chartered accountant specializing in Pakistani banking, specifically Bank of Punjab (BOP) commercial and government e-statements.
Extract every single transaction row and all header/footer metadata from this Bank of Punjab (BOP) bank statement into precise, structured JSON.

BANK STATEMENT STRUCTURE:
Columns typically present:
1. Transaction Date (or Post Date)
2. Value Date
3. Nature of Transaction / Particulars / Description (e.g., "CHEQUE WITHDRAWAL INTERNAL", "CHEQUE DEPOSIT INTERNAL", "INWARD CLEARING", "BANK CHARGES", "FED ON CHARGES", "PROFIT PAYMENT", "FEE COLLECTION", "ONLINE TRANSFER")
4. Instrument Number / Chq No / Ref No (very important: this is the cheque or challan number, e.g., "8061174901", "8061174902", "10234567")
5. Dr. Amount / Withdrawal / Debit (number, 0 if credit)
6. Cr. Amount / Deposit / Credit (number, 0 if debit)
7. Remaining Balance / Balance / Run Balance (number)

Header & Footer details:
- Bank Name: (usually "The Bank of Punjab" or "BOP")
- Branch Name: (e.g. "Samanabad Branch, Faisalabad" or similar)
- Account Number: (e.g. "6580047970800018")
- IBAN: (e.g. "PK...BOP...")
- Statement Period From: (start date formatted YYYY-MM-DD or DD-MM-YYYY)
- Statement Period To: (end date formatted YYYY-MM-DD or DD-MM-YYYY)
- Opening Balance: (first row balance before transactions, or explicitly stated opening balance)
- Closing Balance: (final balance at end of period)
- Total Dr: sum of all debits
- Total Cr: sum of all credits

RULES:
- Extract EVERY transaction row in chronological order. Do not skip or summarize rows.
- If an instrument number has leading spaces or special symbols, clean it to standard alphanumeric/numeric digits.
- Amounts must be positive numbers (do not use negative numbers for Dr; Dr is indicated by drAmount > 0).
- If drAmount or crAmount is empty or "-", set it to 0.
- If Instrument Number is absent for a transaction (such as direct bank charges, tax deduction, or online profit), set instrumentNumber to "" (empty string).
- Return valid JSON matching the specified schema.`;

    const schemaConfig = {
      type: Type.OBJECT,
      properties: {
        bankName: { type: Type.STRING, description: 'Bank Name e.g. The Bank of Punjab' },
        branch: { type: Type.STRING, description: 'Branch name and city' },
        accountNumber: { type: Type.STRING, description: 'Bank account number' },
        iban: { type: Type.STRING, description: 'IBAN number if found' },
        statementPeriodFrom: { type: Type.STRING, description: 'Start date of statement' },
        statementPeriodTo: { type: Type.STRING, description: 'End date of statement' },
        openingBalance: { type: Type.NUMBER, description: 'Opening balance before period transactions' },
        closingBalance: { type: Type.NUMBER, description: 'Closing balance at end of period' },
        totalDr: { type: Type.NUMBER, description: 'Total debits / withdrawals' },
        totalCr: { type: Type.NUMBER, description: 'Total credits / deposits' },
        transactions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              transactionDate: { type: Type.STRING, description: 'Transaction Date' },
              valueDate: { type: Type.STRING, description: 'Value Date' },
              natureOfTransaction: { type: Type.STRING, description: 'Transaction nature / description' },
              instrumentNumber: { type: Type.STRING, description: 'Cheque or Instrument number' },
              drAmount: { type: Type.NUMBER, description: 'Debit / Withdrawal amount' },
              crAmount: { type: Type.NUMBER, description: 'Credit / Deposit amount' },
              remainingBalance: { type: Type.NUMBER, description: 'Balance after this transaction' },
            },
            required: ['transactionDate', 'natureOfTransaction', 'drAmount', 'crAmount', 'remainingBalance'],
          },
        },
      },
      required: ['closingBalance', 'transactions'],
    };

    // Helper to detect temporary model demand spikes / rate limits
    const isTransientError = (err: any): boolean => {
      const errMsg = typeof err === 'string' ? err : err?.message || JSON.stringify(err || '');
      return (
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('Spikes in demand') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('429') ||
        err?.status === 503 ||
        err?.status === 429 ||
        err?.code === 503 ||
        err?.code === 429
      );
    };

    // Supported candidate models to failover seamlessly if one experiences high demand
    const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;
    let rawText = '';

    for (const model of CANDIDATE_MODELS) {
      let attempts = 0;
      const maxAttempts = 2; // Up to 2 attempts per candidate model with backoff

      while (attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`Calling Gemini model ${model} (attempt ${attempts}/${maxAttempts})...`);
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                inlineData: {
                  mimeType,
                  data: fileBase64,
                },
              },
              {
                text: prompt,
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: schemaConfig,
            },
          });

          rawText = response.text || '';
          if (rawText) {
            console.log(`Gemini extraction succeeded using model: ${model}`);
            break;
          }
        } catch (callErr: any) {
          lastError = callErr;
          console.warn(`Model ${model} attempt ${attempts} encountered error:`, callErr?.message || callErr);
          if (isTransientError(callErr) && attempts < maxAttempts) {
            // Wait 1.5 seconds before retrying the same model
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          // Move to next candidate model
          break;
        }
      }

      if (rawText) {
        break;
      }
    }

    if (!rawText) {
      const isDemand = isTransientError(lastError);
      let cleanErrorMessage = 'Failed to extract bank statement from uploaded document.';

      if (isDemand) {
        cleanErrorMessage =
          'The AI model is currently experiencing temporary high demand (503). Please retry in a few moments, or proceed using the Sample Statement or Manual Entry options.';
      } else if (lastError?.message) {
        try {
          const parsedErr = JSON.parse(lastError.message);
          if (parsedErr?.error?.message) {
            cleanErrorMessage = parsedErr.error.message;
          } else {
            cleanErrorMessage = lastError.message;
          }
        } catch {
          cleanErrorMessage = lastError.message;
        }
      }

      return res.status(isDemand ? 503 : 500).json({
        success: false,
        error: cleanErrorMessage,
        isDemandSpike: isDemand,
      });
    }

    // Clean JSON response
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(cleanJson);

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (err: any) {
    console.error('Error in /api/extract-bank-statement:', err);
    let message = err.message || 'Failed to extract bank statement using Gemini';
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error?.message) {
        message = parsed.error.message;
      }
    } catch {}

    return res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Vite & Static Asset Handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
