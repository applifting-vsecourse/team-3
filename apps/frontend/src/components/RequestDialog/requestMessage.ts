import { z } from "zod"

/** The same limit as the API's RequestMessageDto (#175). */
export const REQUEST_MESSAGE_MAX_LENGTH = 500

/** An optional message with a request, counted after trimming like the API counts it. */
export const requestMessageSchema = z
  .string()
  .trim()
  .max(REQUEST_MESSAGE_MAX_LENGTH, `Zpráva může mít nejvýš ${REQUEST_MESSAGE_MAX_LENGTH} znaků`)

/** What is sent: the trimmed message, and blank is none (null), as the API stores it. */
export const toRequestMessage = (text: string): string | null => text.trim() || null
