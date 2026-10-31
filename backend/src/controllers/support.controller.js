import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const chatWithSupport = asyncHandler(async (req, res) => {
  const messages = req.body?.messages;
  const language = req.body?.language || 'en';
  if (
    !req.body
    || typeof req.body !== 'object'
    || Array.isArray(req.body)
    || Object.keys(req.body).some((key) => !['messages', 'language'].includes(key))
    || !['en', 'hi', 'bn'].includes(language)
    || !Array.isArray(messages)
    || messages.length < 1
    || messages.length > 10
    || messages.some((message) => (
      !message
      || typeof message !== 'object'
      || Array.isArray(message)
      || Object.keys(message).some((key) => !['role', 'content'].includes(key))
      || !['user', 'assistant'].includes(message.role)
      || typeof message.content !== 'string'
      || !message.content.trim()
      || message.content.length > 1000
    ))
    || messages[messages.length - 1]?.role !== 'user'
  ) {
    throw new ApiError(400, 'Send a valid support message to continue');
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new ApiError(503, 'AI support is not configured. Please contact the store team.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          {
            role: 'system',
            content: `You are InventoryPro customer support. Respond in ${language === 'hi' ? 'Hindi' : language === 'bn' ? 'Bengali' : 'English'}. Help customers with product browsing, stock, carts, checkout, orders, and account navigation. Be friendly, concise, and professional. Never claim access to private account/order data or promise actions you cannot perform. Never request passwords, payment details, or authentication tokens. For account-specific, payment, or unresolved issues, direct the customer to contact the store team.`,
          },
          ...messages.map(({ role, content }) => ({ role, content: content.trim() })),
        ],
        max_tokens: 350,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    console.error('Hugging Face support request failed:', error.name);
    throw new ApiError(502, 'Customer support is temporarily unavailable. Please try again.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.error('Hugging Face support request failed with status:', response.status);
    throw new ApiError(502, 'Customer support is temporarily unavailable. Please try again.');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(502, 'Customer support returned an invalid response. Please try again.');
  }
  const reply = result?.choices?.[0]?.message?.content;
  const content = Array.isArray(reply)
    ? reply.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('').trim()
    : typeof reply === 'string' ? reply.trim() : '';

  if (!content) {
    throw new ApiError(502, 'Customer support returned an empty response. Please try again.');
  }

  return res.status(200).json(new ApiResponse(200, { message: content }, 'Support response received'));
});

export { chatWithSupport };
