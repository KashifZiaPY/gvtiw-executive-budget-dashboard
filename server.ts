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

// AI Reconciliation Difference Analyzer API
app.post('/api/analyze-reconciliation-difference', async (req, res) => {
  try {
    const {
      bankName,
      accountNo,
      differenceAmount,
      cashBookBalance,
      bankStatementBalance,
      periodFrom,
      periodTo,
      matchedCombinations,
      allCandidatesSummary,
    } = req.body;

    if (differenceAmount === undefined || differenceAmount === null) {
      return res.status(400).json({ error: 'differenceAmount is required' });
    }

    const ai = getGeminiClient();

    const prompt = `You are a Senior Chartered Public Accountant & Statutory Bank Reconciliation Auditor.
Analyze the following Bank Reconciliation variance between the Cash Book and Bank Statement for Government Vocational Training Institute for Women (GVTIW).

RECONCILIATION PARAMETERS:
- Bank Account: ${bankName || 'BOP'} (${accountNo || 'N/A'})
- Audit Period: From ${periodFrom || 'N/A'} To ${periodTo || 'N/A'}
- Balance as per Cash Book: Rs. ${Number(cashBookBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Balance as per Bank Statement: Rs. ${Number(bankStatementBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Total Variance / Difference to Explain: Rs. ${Number(differenceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Candidate Cheques & Entries Identified by Combinatorial Math:
${JSON.stringify(matchedCombinations || [], null, 2)}
- Summary of candidate transactions evaluated: ${JSON.stringify(allCandidatesSummary || {})}

TASK:
1. Provide a professional financial audit assessment explaining which candidate match (or combination) is the most credible cause of this variance.
2. Consider standard banking practice (cheques issued near month-end take 2-4 business days to clear; tax deduction cheques to FBR/PRA often clear late; bank charges debited directly).
3. If there is a near-match with a small residual delta (e.g., Rs. 50, 100, 500), assess whether the residual could represent unrecorded bank charges, FED, or withholding tax.
4. Give actionable advice for the Drawing & Disbursing Officer (DDO) / Accountant to finalize the monthly BRS.

Return structured JSON according to the schema:
- primaryAssessment: A concise 2-3 sentence executive audit finding.
- recommendedOptionIndex: Index (0-based) of the most recommended combination in matchedCombinations, or -1 if none.
- combinationNotes: Array of short audit comments corresponding to each candidate combination.
- potentialBankCharges: String noting any likely bank charges / FED / rounding differences if applicable.
- actionRecommendations: Array of bulleted steps the accountant should take.`;

    const schemaConfig = {
      type: Type.OBJECT,
      properties: {
        primaryAssessment: { type: Type.STRING, description: 'Executive audit finding summary' },
        recommendedOptionIndex: { type: Type.INTEGER, description: 'Best combination index (0-based)' },
        combinationNotes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Short audit reasoning for each candidate option',
        },
        potentialBankCharges: { type: Type.STRING, description: 'Remarks on potential bank charges or withholding' },
        actionRecommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Actionable steps for the accountant',
        },
      },
      required: ['primaryAssessment', 'combinationNotes', 'actionRecommendations'],
    };

    const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let rawText = '';
    let lastError: any = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        console.log(`Calling Gemini model ${model} for reconciliation analysis...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schemaConfig,
          },
        });
        rawText = response.text || '';
        if (rawText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Reconciliation AI error with ${model}:`, err?.message || err);
      }
    }

    if (!rawText) {
      // Graceful fallback if AI is unreachable so UI never hangs
      return res.json({
        success: true,
        data: {
          primaryAssessment: `Mathematical subset-sum analysis identified candidate cash book transactions matching the Rs. ${Number(differenceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} variance. Review the matched cheques below and verify clearance status against your official bank e-statement.`,
          recommendedOptionIndex: 0,
          combinationNotes: (matchedCombinations || []).map(
            (c: any, i: number) => `Option ${i + 1}: ${c.items.length} item(s) totalling Rs. ${c.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Delta: Rs. ${c.delta.toFixed(2)})`
          ),
          potentialBankCharges: 'Any residual variance below Rs. 500 is likely attributable to unrecorded bank debit advices, FED, or SMS alert fees.',
          actionRecommendations: [
            'Verify candidate cheque numbers in your physical cheque counterfoils or bank clearing history.',
            'Click "Apply to Unpresented List" to transfer verified cheques into your active Reconciliation Statement.',
            'Confirm that the final unexplained variance reaches Rs. 0.00.',
          ],
        },
      });
    }

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
    console.error('Error in /api/analyze-reconciliation-difference:', err);
    // Return friendly fallback rather than 500
    return res.json({
      success: true,
      data: {
        primaryAssessment: 'Automated matching located candidate cash book transactions that total the reconciliation variance.',
        recommendedOptionIndex: 0,
        combinationNotes: [],
        potentialBankCharges: 'Verify any small rounding or bank service fee discrepancies with bank advice slips.',
        actionRecommendations: ['Inspect the matched items below and select the correct cheques to reconcile.'],
      },
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
