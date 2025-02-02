import OpenAI from "openai";

export const runtime = "edge";

// --- Interfaces ---
interface ChatMessage {
  role: "user" | "system" | "assistant";
  content: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
}

interface RequestPayload {
  messages: ChatMessage[];
}

interface TokenAnalysisResult {
  tokenAddress: string;
  ticker: string;
}

// --- Constants ---
const SYSTEM_PROMPT = `You are an intelligent AI assistant that performs sentiment analysis on memecoins. 
You are given a message and you need to analyze the sentiment of the message. 
You need to ask the user for the token address and the ticker. 
Once you have the token address and the ticker respond back with those two parameters. 
We will use this to perform sentiment analysis on the token by making an external API call to the sAIgent API.`;

const TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "getTokenAddressAndTicker",
    description: "Get the token address and the ticker from the user",
    parameters: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "The token address" },
        ticker: { type: "string", description: "The ticker of the token" },
      },
      required: ["tokenAddress", "ticker"],
    },
  },
};

// --- Helper Functions ---
const generateMessageId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function createErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function handleError(error: any): Response {
  console.error("Error in API call:", error);
  const errorDetails = error instanceof Error ? error : new Error("Unknown error");
  const status = error.status || 500;
  let message = errorDetails.message;
  if (message.toLowerCase().includes("api key not found")) {
    message = "API Key not found. Please check your configuration.";
  } else if (status === 401) {
    message = "API Key is incorrect. Please check your configuration.";
  } else {
    message = "An unexpected error occurred";
  }
  return createErrorResponse(message, status);
}

// --- Main Handler ---
export default async function handler(request: Request) {
  console.log("Request received");

  try {
    // Parse and validate request payload.
    const json = await request.json();
    const { messages } = json as RequestPayload;
    if (!messages || !Array.isArray(messages)) {
      return createErrorResponse("Invalid payload: messages must be an array.", 400);
    }

    // Ensure the API key is set.
    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      return createErrorResponse("API Key not configured", 500);
    }

    // Initialize the Venice client.
    const venice = new OpenAI({
      apiKey,
      baseURL: "https://api.venice.ai/api/v1",
    });

    // Create the chat completion request.
    const response = await venice.chat.completions.create({
      model: "llama-3.2-3b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      tool_choice: { type: "function", function: { name: "getTokenAddressAndTicker" } },
      tools: [TOOL_DEFINITION],
      stream: false,
    });

    console.log("Response received", response);

    const parsedResponse = JSON.parse(response);

    const firstChoice = parsedResponse.choices[0];
    const message = firstChoice?.message;

    // Extract tool call information.
    const toolCalls = message?.tool_calls;

    // Parse the arguments from the first tool call.
    const toolCallArgs = toolCalls?.[0]?.function.arguments;
    console.log("Tool call arguments:", toolCallArgs);

    let args;
    try {
      args = JSON.parse(toolCallArgs || "");
    } catch (error) {
      console.error("Failed to parse tool call arguments:", error);
      return createErrorResponse("Invalid tool call response", 400);
    }

    const { tokenAddress, ticker } = args as TokenAnalysisResult;
    if (!tokenAddress || !ticker) {
      return createErrorResponse("Missing token address or ticker in AI response", 400);
    }

    console.log("Token address:", tokenAddress);
    console.log("Ticker:", ticker);

    // Call the sentiment analysis API.
    const sentimentResponse = await fetch("https://3e84-4-15-123-185.ngrok-free.app/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_address: tokenAddress,  // Ensure parameter names match the external API.
        token_symbol: ticker,
      }),
    });

    // Sentiment analysis response
    const sentimentData = await sentimentResponse.json();

    const sentimentScore = sentimentData.score ? sentimentData.score : 0;
    const status = sentimentData.status ? sentimentData.status : "error";
    const risk_level = sentimentData.risk_level ? sentimentData.risk_level : "unknown";
    const components = sentimentData.components ? sentimentData.components : [];
    const analysis = sentimentData.analysis ? sentimentData.analysis : [];
    const logs = sentimentData.logs ? sentimentData.logs : [];

    console.log("Sentiment data received", sentimentData);

    const sentimentMessage = `The sentiment of the token ${ticker} (${tokenAddress}) is the following: ${sentimentScore}. The status of the sentiment analysis is ${status}. The risk level of the sentiment analysis is ${risk_level}. The components of the sentiment analysis are ${components}. The analysis of the sentiment analysis is ${analysis}. The logs of the sentiment analysis are ${logs}.`;

    messages.push({ role: "assistant", content: sentimentMessage });

    // Follow up sentiment analysis call
    const followUpResponse = await venice.chat.completions.create({
      model: "deepseek-r1-llama-70b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    console.log("Follow up response received", followUpResponse);

    const parsedFollowUpResponse = JSON.parse(followUpResponse);

    const followUpChoice = parsedFollowUpResponse?.choices[0];
    const followUpMessage = followUpChoice?.message.content;

    // Construct the final JSON response.
    const jsonResponse = {
      id: response.id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "deepseek-r1-llama-70b",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: followUpMessage },
          finish_reason: followUpChoice.finish_reason,
        },
      ],
      usage: response.usage,
    };

    console.log("Sending response:", jsonResponse);

    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return handleError(error);
  }
}
