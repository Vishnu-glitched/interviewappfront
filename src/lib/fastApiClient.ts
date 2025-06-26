const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL;

export const callFastAPI = async (user_id: string, message: string) => {
  try {
    const response = await fetch(`${FASTAPI_URL}/agent-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`FastAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error calling FastAPI:", err);
    throw err;
  }
};