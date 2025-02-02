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

    // Ensure the API key is set.
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

    // Prepare the request options for the Venice chat completion API.
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-r1-llama-70b",
        messages: [
          {
            role: "system",
            content: "You are an intelligent AI assistant.",
          },
          ...messages,
        ],
        stream: false,
      }),
    };

    // Make the fetch call to the Venice API.
    const response = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      requestOptions
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("Venice API Response:", responseData);

    // Extract the first choice from the response.
    const firstChoice = responseData.choices?.[0];
    const messageContent = firstChoice?.message;
    const finalChoice = firstChoice;

    if (!finalChoice?.message) {
      console.error("Final choice has no message:", finalChoice);
      throw new Error("No message returned in the first choice.");
    }

    // Construct the final JSON response.
    const jsonResponse = {
      id: responseData.id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "deepseek-r1-llama-70b",
      choices: [
        {
          index: 0,
          message: messageContent,
          finish_reason: finalChoice.finish_reason,
        },
      ],
      usage: responseData.usage,
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
