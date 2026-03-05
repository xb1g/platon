import { llmReflect } from '../lib/llm.js';
import { storeReflection } from '../lib/store-reflection.js';

export const reflectSession = async (data: any) => {
  const reflection = await llmReflect(data);
  await storeReflection(reflection);
};
