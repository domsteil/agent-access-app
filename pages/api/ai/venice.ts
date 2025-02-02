import OpenAI from "openai";

export const runtime = "edge";

export default async function handler(request: Request) {
  const json = await request.json();
  console.log('Received request:', json);
  const { messages } = json as { messages: any[] };

  try {
    const venice = new OpenAI({
      apiKey: process.env.VENICE_API_KEY,
      baseURL: "https://api.venice.ai/api/v1"
    });

    const functions = [];

    // const tools = functions.map(f => ({ type: "function", function: f }));

    const response = await venice.chat.completions.create({
      model: 'deepseek-r1-llama-70b',
      messages: [
        {
          role: "system",
          content: "You are an intelligent AI assistant."
        },
        ...messages
      ],
      stream: false
    });

    console.log('Venice API Response:', response);

    let finalResponse = response.choices[0].message;

    let json_response = {
      id: response.id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "deepseek-r1-llama-70b",
      choices: [
        {
          index: 0,
          message: finalResponse,
          finish_reason: response.choices[0].finish_reason
        }
      ],
      usage: response.usage,
    };

    console.log('Sending response:', json_response);

    return new Response(JSON.stringify(json_response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('Error in API call:', error);
    let errorMessage = error.message || "An unexpected error occurred";
    const errorCode = error.status || 500;
    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage = "API Key not found. Please check your configuration.";
    } else if (errorCode === 401) {
      errorMessage = "API Key is incorrect. Please check your configuration.";
    }
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}