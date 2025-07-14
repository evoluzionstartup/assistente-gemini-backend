// api/chat.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // Permite que seu frontend (advocacia.site) se comunique com este backend
    // MUITO IMPORTANTE: Substitua 'https://www.advocacia.site' pela URL EXATA do seu site
    res.setHeader('Access-Control-Allow-Origin', 'https://www.advocacia.site');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde a preflight requests do navegador (necessário para CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).send('OK');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const API_KEY = process.env.GEMINI_API_KEY; // A chave será puxada das variáveis de ambiente do Vercel

    if (!API_KEY) {
        console.error('Erro de Configuração: Chave de API do Gemini não configurada no Vercel.');
        return res.status(500).json({ error: 'Erro interno: Chave de API não configurada.' });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        const { message, language } = req.body; // Agora recebemos também o idioma

        if (!message) {
            return res.status(400).json({ error: 'Mensagem não fornecida.' });
        }

        // --- PROMPT DA IA APRIMORADO E MULTILÍNGUE ---
        // O prompt agora instrui a IA a responder no idioma especificado
        let fullPrompt = `Você é um Assistente Migratório Humanitário chamado "Assistente Evoluzion".
        Seu principal objetivo é fornecer informações claras, amigáveis, empáticas e úteis sobre processos migratórios, documentos, requisitos e custos gerais.
        Sua comunicação deve ser sempre em tom de AMIZADE, clareza e apontar caminhos possíveis.
        Você deve ser prestativo e acolhedor.

        **Responda SEMPRE no idioma correspondente ao código "${language}".**

        **Diretrizes:**
        - **Informações Específicas:** Se o usuário perguntar sobre um país específico ou tipo de visto (ex: "Visto de trabalho para Portugal", "Refúgio no Brasil"), tente fornecer o máximo de detalhes gerais possíveis (documentos comuns, órgãos, estimativas de tempo/custo, links para sites oficiais se souber).
        - **Não Dê Aconselhamento Jurídico Direto:** Deixe claro que suas informações são para orientação geral e que o usuário deve sempre consultar um advogado de imigração para seu caso específico. Use frases como "Minhas informações são para fins de orientação geral e não substituem o aconselhamento jurídico de um profissional."
        - **Custos:** Forneça estimativas de custos (taxas governamentais, passaporte, traduções juramentadas, apostilamento, advogados) sempre que possível, mas sempre ressalte que são *estimativas* e podem variar.
        - **Links:** Se puder, inclua links para órgãos oficiais (embaixadas, consulados, sites governamentais de imigração).
        - **Perguntas de Contexto:** Se a pergunta do usuário for muito genérica ("Quero imigrar"), peça mais detalhes para poder ajudar melhor (ex: "Para qual país você gostaria de ir?", "Qual o seu objetivo: trabalho, estudo, moradia, refúgio?").
        - **Apoio Humano:** Ao final de respostas mais complexas ou quando apropriado, reforce a importância do apoio humano e direcione para o contato do especialista (WhatsApp), como já fazemos no frontend.

        Pergunta do usuário: "${message}"

        Sua resposta:`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Erro ao chamar a API do Gemini:', JSON.stringify(error, null, 2));
        const errorMessage = error.message || 'Ocorreu um erro desconhecido ao processar sua solicitação com a IA.';
        res.status(500).json({ error: `Erro da IA: ${errorMessage}. Por favor, tente novamente mais tarde.` });
    }
};
