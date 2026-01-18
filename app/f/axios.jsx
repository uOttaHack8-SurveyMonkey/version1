import axios from "axios";

const ELEVEN_API_KEY = process.env.NEXT_PUBLIC_ELEVEN_API_KEY; // store in .env
const VOICE_ID = "cDPnVvi9OUoTtLoEBZkr"; // replace with your Eleven Labs voice ID

async function speakWithElevenLabs(text) {
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      { text },
      {
        responseType: "arraybuffer",
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
      }
    );

    const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve) => {
      audio.onended = resolve;
      audio.play();
    });
  } catch (error) {
    console.error("Error generating speech:", error);
  }
}
