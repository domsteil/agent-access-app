import OpenAI from "openai";

export const runtime = "edge";

export default async function handler(request: Request) {
  const json = await request.json();
  console.log('Received request:', json);
  const { messages } = json as { messages: any[] };

  try {

    const response = await fetch(process.env.SAIGENT_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages
      })
    });

    let finalResponse = response    

    let json_response = {
      id: 'saigent-chat-completion',
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "deepseek-r1-llama-70b",
      choices: [
        {
          index: 0,
          message: finalResponse,
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
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