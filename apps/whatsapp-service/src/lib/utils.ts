/**
 * Splits a long message into smaller chunks, each within a specified character limit.
 * This is useful for messaging platforms like WhatsApp that have a message length limit.
 *
 * @param message The full message string to be split.
 * @param maxLength The maximum length of each chunk. Defaults to 1500 to be safe.
 * @returns An array of message chunks.
 */
export function splitMessage(
  message: string,
  maxLength = 1500,
): string[] {
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    return [];
  }
  if (trimmedMessage.length <= maxLength) {
    return [trimmedMessage];
  }

  const chunks: string[] = [];
  let currentChunk = "";

  // Split the message by sentences or newlines to avoid breaking them mid-way
  const sentences = trimmedMessage.match(/[^.!?\n]+[.!?\n]*/g) || [trimmedMessage];

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = "";
    }
    currentChunk += sentence;
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If a single chunk is still too long (e.g., a very long sentence with no breaks), split it by words
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > maxLength) {
      let wordChunk = "";
      const words = chunk.split(" ");
      for (const word of words) {
        if (wordChunk.length + word.length + 1 > maxLength) {
          if (wordChunk.trim()) {
            finalChunks.push(wordChunk.trim());
          }
          wordChunk = "";
        }
        wordChunk += `${word} `;
      }
      if (wordChunk.trim()) {
        finalChunks.push(wordChunk.trim());
      }
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks.filter(c => c.length > 0);
} 