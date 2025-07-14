// api/chat.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // Permite que seu frontend (advocacia.site) se comunique com este backend
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
        // Recebe as variáveis de contexto e o estágio da conversa
        const { message, language, chatHistory, originCountry, currentLocation, currentStatus, destinationCountry, objective, conversationStage } = req.body; 

        if (!message) {
            return res.status(400).json({ error: 'Mensagem não fornecida.' });
        }

        // --- PROMPT DA IA APRIMORADO PARA DETECÇÃO DE IDIOMA ---
        let systemInstruction = `Você é um Assistente Migratório Humanitário chamado "Assistente Evoluzion".
        Seu principal objetivo é fornecer informações claras, amigáveis, empáticas e úteis sobre processos migratórios, documentos, requisitos e custos gerais.
        Sua comunicação deve ser sempre em tom de AMIZADE, clareza e apontar caminhos possíveis.
        Você deve ser prestativo e acolhedor.

        **Instrução CRÍTICA de Idioma:** Detecte o idioma da **última mensagem do usuário** e responda **EXCLUSIVAMENTE naquele idioma**. Se a última mensagem do usuário for em Português, responda em Português. Se for em Hindi, responda em Hindi. Se for em uma mistura, tente responder no idioma predominante.

        **Diretrizes Gerais:**
        - **Não Dê Aconselhamento Jurídico Direto:** Deixe claro que suas informações são para orientação geral e que o usuário deve sempre consultar um advogado de imigração para seu caso específico. Use frases como "Minhas informações são para fins de orientação geral e não substituem o aconselhamento jurídico de um profissional."
        - **Apoio Humano:** Ao final de respostas mais complexas ou quando apropriado, reforce a importância do apoio humano e direcione para o contato do especialista (WhatsApp).`;

        let userQueryForAI = message; // A mensagem que o usuário digitou

        // Se o estágio for de geração de roteiro, construímos um prompt detalhado para a IA
        if (conversationStage === 'ask_objective') { // Este é o estágio onde o frontend envia a query completa
            userQueryForAI = `O usuário forneceu as seguintes informações:
            - País de origem/nascimento: ${originCountry}
            - Localização atual: ${currentLocation}
            ${currentStatus ? `- Condição atual: ${currentStatus}` : ''}
            - País de destino/regularização: ${destinationCountry}
            - Objetivo: ${objective}

            Com base nessas informações, por favor, forneça um roteiro passo a passo personalizado. Inclua:
            - Documentos e requisitos necessários.
            - Custos e valores estimados (taxas governamentais, traduções juramentadas, apostilamentos, serviços de terceiros como advogados/assessoria jurídica).
            - Mencione caminhos alternativos que possam diminuir os prazos.
            - **EXCLUA** valores como passagem, viagem, alimentação, hospedagem.
            - Ao final, **INDIQUE** como melhor caminho inicial contratar uma assessoria jurídica e o acompanhamento especializado para ter segurança jurídica e paz durante todo o processo.
            - Mantenha a resposta concisa, mas completa, com no máximo 3-4 parágrafos.
            `;
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: { parts: [{ text: systemInstruction }] }
        });

        const chat = model.startChat({
            history: chatHistory // Passa o histórico completo da conversa
        });

        const result = await chat.sendMessage(userQueryForAI); // Envia a mensagem do usuário (ou o prompt completo)
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Erro ao chamar a API do Gemini:', JSON.stringify(error, null, 2));
        const errorMessage = error.message || 'Ocorreu um erro desconhecido ao processar sua solicitação com a IA.';
        res.status(500).json({ error: `Erro da IA: ${errorMessage}. Por favor, tente novamente mais tarde.` });
    }
};
