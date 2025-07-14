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
        return res.status(500).json({ error: 'Chave de API do Gemini não configurada no Vercel.' });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        const { message, paisOrigem, paisDestino, tipoServico } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Mensagem não fornecida.' });
        }

        // Constrói o prompt para o Gemini com o contexto do usuário
        let fullPrompt = `Você é um assistente migratório humanitário. Responda à pergunta do usuário de forma clara, amigável e com informações que ajudem no processo migratório. Mantenha um tom profissional mas acolhedor. Evite dar conselhos jurídicos diretos, mas direcione para fontes oficiais. O usuário está em ${paisOrigem || 'um país não especificado'} e tem interesse em ir para ${paisDestino || 'um país não especificado'} buscando ${tipoServico || 'um serviço não especificado'}.

        Pergunta do usuário: "${message}"

        Sua resposta:`;

        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Ou "gemini-1.5-flash", que é mais leve e rápido

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Erro ao chamar a API do Gemini:', error);
        res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação com a IA. Tente novamente mais tarde.' });
    }
};
