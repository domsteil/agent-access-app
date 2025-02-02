import OpenAI from "openai";

export const runtime = "edge";

export default async function handler(request: Request) {
  try {
    // Parse the incoming request JSON.
    const json = await request.json();
    console.log("Received request:", json);
    const { messages } = json as { messages: any[] };

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ message: "Invalid payload: messages must be an array." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Initialize the Venice client.
    const venice = new OpenAI({
      apiKey: process.env.VENICE_API_KEY,
      baseURL: "https://api.venice.ai/api/v1",
    });

    // Create the chat completion request.
    const response = await venice.chat.completions.create({
      model: "deepseek-r1-llama-70b",
      messages: [
        {
          role: "system",
          content: "You are an intelligent AI assistant.",
        },
        ...messages,
      ],
      stream: false,
    });

    console.log("Venice API Response:", response);

    // Ensure response.choices exists and is a non-empty array.
    if (!Array.isArray(response?.choices) || response.choices.length === 0) {
      console.error("Unexpected response structure. Type:", typeof response, "Response:", response);
      throw new Error("No choices returned from API.");
    }

    const finalChoice = response.choices[0];
    if (!finalChoice?.message) {
      console.error("Final choice has no message:", finalChoice);
      throw new Error("No message returned in the first choice.");
    }

    // Construct the final JSON response.
    const jsonResponse = {
      id: response.id,
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
      usage: response.usage,
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
