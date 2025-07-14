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
        const { message, language, chatHistory, originCountry, currentLocation, currentStatus, destinationCountry, objective, requestedStage } = req.body; 

        if (!message && requestedStage !== 'initial_greeting' && requestedStage !== 'ask_origin' && requestedStage !== 'ask_current_location' && requestedStage !== 'ask_current_status' && requestedStage !== 'ask_destination' && requestedStage !== 'ask_objective' && requestedStage !== 'generate_roadmap' && requestedStage !== 'other_subject_prompt') {
            return res.status(400).json({ error: 'Mensagem não fornecida para o estágio atual.' });
        }

        // --- PROMPT DA IA BASE ---
        let systemInstruction = `Você é um Assistente Migratório Humanitário chamado "Assistente Evoluzion".
        Seu principal objetivo é fornecer informações claras, amigáveis, empáticas e úteis sobre processos migratórios, documentos, requisitos e custos gerais.
        Sua comunicação deve ser sempre em tom de AMIZADE, clareza e apontar caminhos possíveis.
        Você deve ser prestativo e acolhedor.

        **Instrução CRÍTICA de Idioma:** Detecte o idioma da **última mensagem do usuário** e responda **EXCLUSIVAMENTE naquele idioma**. Se a última mensagem do usuário for em Português, responda em Português. Se for em Hindi, responda em Hindi. Se for em uma mistura, tente responder no idioma predominante.

        **Diretrizes Gerais:**
        - **Respostas Curtas e Direcionadas:** Para perguntas de coleta de dados (país de origem, destino, etc.), suas respostas devem ser curtas, diretas e fazer a próxima pergunta.
        - **Roteiro Detalhado:** Apenas quando todas as informações (país de origem, localização, status, destino, objetivo) forem coletadas, forneça o roteiro detalhado conforme solicitado.
        - **Não Dê Aconselhamento Jurídico Direto:** Deixe claro que suas informações são para orientação geral e que o usuário deve sempre consultar um advogado de imigração para seu caso específico. Use frases como "Minhas informações são para fins de orientação geral e não substituem o aconselhamento jurídico de um profissional."
        - **Apoio Humano:** Ao final de respostas mais complexas ou quando apropriado, reforce a importância do apoio humano e direcione para o contato do especialista (WhatsApp).`;

        let userQueryForAI = message; // A mensagem que o usuário digitou ou vazia para prompts do assistente

        // Lógica para gerar as perguntas do assistente com base no requestedStage
        if (requestedStage === 'ask_origin') {
            userQueryForAI = `Por favor, pergunte ao usuário: "Para começarmos, qual é o seu país de origem (país de nascimento)?". Mantenha a resposta curta, apenas a pergunta.`;
        } else if (requestedStage === 'ask_current_location') {
            userQueryForAI = `O usuário informou que seu país de origem é ${originCountry}. Agora, por favor, pergunte ao usuário: "Você está atualmente no seu país de origem ou em um país estrangeiro?". Mantenha a resposta curta, apenas a pergunta.`;
        } else if (requestedStage === 'ask_current_status') {
            userQueryForAI = `O usuário informou que está em um país estrangeiro. Agora, por favor, pergunte ao usuário: "Qual é a sua condição atual neste país estrangeiro (ex: turista, estudante, trabalhador, refugiado, indocumentado)?". Mantenha a resposta curta, apenas a pergunta.`;
        } else if (requestedStage === 'ask_destination') {
            userQueryForAI = `O usuário informou seu país de origem (${originCountry}) e localização (${currentLocation}${currentStatus ? ' e status ' + currentStatus : ''}). Agora, por favor, pergunte ao usuário: "Para qual país você pretende ir ou está buscando regularização?". Mantenha a resposta curta, apenas a pergunta.`;
        } else if (requestedStage === 'ask_objective') {
            userQueryForAI = `O usuário informou seu país de origem (${originCountry}), localização (${currentLocation}${currentStatus ? ' e status ' + currentStatus : ''}) e país de destino (${destinationCountry}). Agora, por favor, pergunte ao usuário: "Qual é o seu objetivo principal (ex: visto de turismo, trabalho, estudo, residência temporária, residência permanente, refúgio, anistia, reunião familiar)?". Mantenha a resposta curta, apenas a pergunta.`;
        } else if (requestedStage === 'generate_roadmap') {
            userQueryForAI = `O usuário forneceu as seguintes informações:
            - País de origem/nascimento: ${originCountry}
            - Localização atual: ${currentLocation}
            ${currentStatus && currentStatus !== 'no_foreign_status' ? `- Condição atual: ${currentStatus}` : ''}
            - País de destino/regularização: ${destinationCountry}
            - Objetivo: ${objective}

            Com base nessas informações, por favor, forneça um roteiro passo a passo personalizado. Inclua:
            - Documentos e requisitos necessários.
            - Custos e valores estimados (taxas governamentais, traduções juramentadas, apostilamentos, serviços de terceiros como advogados/assessoria jurídica).
            - Mencione caminhos alternativos que possam diminuir os prazos.
            - **EXCLUA** valores como passagem, viagem, alimentação, hospedagem.
            - Ao final, **INDIQUE** como melhor caminho inicial contratar uma assessoria jurídica e o acompanhamento especializado para ter segurança jurídica e paz durante todo o processo.
            - Mantenha a resposta concisa, mas completa, com no máximo 3-4 parágrafos.`;
        } else if (requestedStage === 'other_subject_prompt') {
            userQueryForAI = `Por favor, pergunte ao usuário: "Por favor, digite o novo assunto que você gostaria de discutir.". Mantenha a resposta curta, apenas a pergunta.`;
        }
        // Se requestedStage não for nenhum dos acima, assume que é chat livre e usa a 'message' diretamente.


        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: { parts: [{ text: systemInstruction }] }
        });

        const chat = model.startChat({
            history: chatHistory // Passa o histórico completo da conversa
        });

        const result = await chat.sendMessage(userQueryForAI); // Envia a mensagem do usuário (ou o prompt gerado)
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Erro ao chamar a API do Gemini:', JSON.stringify(error, null, 2));
        const errorMessage = error.message || 'Ocorreu um erro desconhecido ao processar sua solicitação com a IA.';
        res.status(500).json({ error: `Erro da IA: ${errorMessage}. Por favor, tente novamente mais tarde.` });
    }
};
