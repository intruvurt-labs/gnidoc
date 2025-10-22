import { publicProcedure } from '../../../create-context';
import { Adapters } from '../../../../lib/providers/orchestrator';

export default publicProcedure.query(() => {
  const providers = Object.keys(Adapters);
  
  const configured = providers.filter((provider) => {
    switch (provider) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'anthropic':
        return !!process.env.ANTHROPIC_API_KEY;
      case 'gemini':
        return !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
      case 'xai':
        return !!process.env.XAI_API_KEY;
      case 'deepseek':
        return !!process.env.DEEPSEEK_API_KEY;
      case 'huggingface':
        return !!(process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY);
      case 'ollama':
        return true;
      case 'replicate':
        return !!process.env.REPLICATE_API_TOKEN;
      case 'runway':
        return !!process.env.RUNWAY_API_KEY;
      default:
        return false;
    }
  });

  return {
    all: providers,
    configured,
    count: configured.length,
  };
});
