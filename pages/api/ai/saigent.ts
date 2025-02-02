export const runtime = "edge";

// Interfaces
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

// Constants
const SYSTEM_PROMPT = `You are an intelligent AI assistant that performs sentiment analysis on memecoins. 
You are given a message and you need to analyze the sentiment of the message. 
You need to ask the user for the token address and the ticker. 
Once you have the token address and the ticker respond back with those two parameters. 
We will use this to perform sentiment analysis on the token by making an external API call to the sAIgent API.`;

const FOLLOW_UP_SYSTEM_PROMPT = `You are an AI assistant analyzing cryptocurrency sentiment data.
Given the sentiment analysis results, provide a detailed and insightful interpretation of the findings.
Focus on explaining the risk level, analysis components, and overall sentiment score in a way that helps users understand the token's current market perception.`;

const TOOL_DEFINITION = {
  type: "function",
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

export default async function handler(request: Request) {
  try {
    // Parse the incoming request JSON
    const json = await request.json();
    console.log("Received request:", json);
    const { messages } = json as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ message: "Invalid payload: messages must be an array." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Ensure the API key is set
    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ message: "API Key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // First call: Get token information
    const tokenInfoRequestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.2-3b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tool_choice: { type: "function", function: { name: "getTokenAddressAndTicker" } },
        tools: [TOOL_DEFINITION],
        stream: false,
      }),
    };

    const tokenInfoResponse = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      tokenInfoRequestOptions
    );

    if (!tokenInfoResponse.ok) {
      throw new Error(`HTTP error! status: ${tokenInfoResponse.status}`);
    }

    const tokenInfoData = await tokenInfoResponse.json();
    console.log("Token info response received:", tokenInfoData);

    // Parse token information
    const toolCalls = tokenInfoData.choices[0]?.message?.tool_calls;
    const toolCallArgs = toolCalls?.[0]?.function.arguments;

    let args;
    try {
      args = JSON.parse(toolCallArgs || "");
    } catch (error) {
      console.error("Failed to parse tool call arguments:", error);
      throw new Error("Invalid tool call response");
    }

    const { tokenAddress, ticker } = args;
    if (!tokenAddress || !ticker) {
      throw new Error("Missing token address or ticker in AI response");
    }

    // Call sentiment analysis API
    const sentimentResponse = await fetch("https://64fd-4-15-123-185.ngrok-free.app/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_address: tokenAddress,
        token_symbol: ticker,
      }),
    });

    if (!sentimentResponse.ok) {
      throw new Error(`Sentiment API error! status: ${sentimentResponse.status}`);
    }

    const sentimentData = await sentimentResponse.json();
    console.log("Sentiment data received:", sentimentData);

    // Format sentiment data for follow-up analysis
    const sentimentMessage = `Sentiment Analysis Results:
Score: ${sentimentData.score || 0}
Status: ${sentimentData.status || "unknown"}
Risk Level: ${sentimentData.risk_level || "unknown"}
Analysis: ${sentimentData.analysis || "unknown"}`;

    // Follow-up call: Generate analysis of sentiment data
    const followUpRequestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-r1-llama-70b",
        messages: [
          { role: "system", content: FOLLOW_UP_SYSTEM_PROMPT },
          ...messages,
          { role: "assistant", content: sentimentMessage }
        ],
        stream: false,
      }),
    };

    const followUpResponse = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      followUpRequestOptions
    );

    if (!followUpResponse.ok) {
      throw new Error(`HTTP error! status: ${followUpResponse.status}`);
    }

    const followUpData = await followUpResponse.json();
    console.log("Follow-up analysis received:", followUpData);

    const finalChoice = followUpData.choices?.[0];
    if (!finalChoice?.message) {
      throw new Error("No message returned in the follow-up response.");
    }

    // Construct the final JSON response
    const jsonResponse = {
      id: followUpData.id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "deepseek-r1-llama-70b",
      choices: [
        {
          index: 0,
          message: finalChoice.message,
          finish_reason: finalChoice.finish_reason,
        },
      ],
      usage: followUpData.usage,
    };

    console.log("Sending response:", jsonResponse);

    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error: any) {
    console.error("Error in API call:", error);
    let errorMessage = error.message || "An unexpected error occurred";
    const errorCode = error.status || 500;

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage = "API Key not found. Please check your configuration.";
    } else if (errorCode === 401) {
      errorMessage = "API Key is incorrect. Please check your configuration.";
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode,
      headers: { "Content-Type": "application/json" },
    });
  }
}