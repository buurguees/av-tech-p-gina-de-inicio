/**
 * Procesa un chat request completo:
 * 1. Lee config del agente
 * 2. Lee mensaje del usuario
 * 3. Obtiene contexto ERP role-aware
 * 4. Construye system prompt desde config + contexto
 * 5. Llama a Ollama
 * 6. Detecta sugerencias en la respuesta
 * 7. Guarda respuesta
 * 8. Marca completado
 */
export async function processRequest(supabase, request, config) {
  const { LOCK_OWNER, OLLAMA_URI } = config;
  const startTime = Date.now();

  try {
    // 1. Obtener contexto ERP (role-aware — incluye system_instructions)
    const { data: context, error: ctxErr } = await supabase.rpc('ai_get_context_general', {
      p_user_id: request.user_id,
    });
    if (ctxErr) throw new Error(`Context error: ${ctxErr.message}`);

    // 2. Leer mensaje del usuario
    const { data: msgData, error: msgErr } = await supabase.rpc('ai_get_message_content', {
      p_message_id: request.latest_user_message_id,
    });
    if (msgErr) throw new Error(`Message error: ${msgErr.message}`);
    const userMessage = msgData?.[0]?.content;
    if (!userMessage) throw new Error('No user message content found');

    // 3. Construir system prompt desde contexto
    // context.system_instructions ya contiene: base + perfil + sugerencias
    const contextData = { ...context };
    delete contextData.system_instructions;
    delete contextData.suggestion_prompts;
    delete contextData.locale;

    const systemPrompt = (context.system_instructions || '')
      + '\n\nFecha actual: ' + (context.today || new Date().toISOString().slice(0, 10))
      + '\n\nDatos del ERP:\n' + JSON.stringify(contextData, null, 2);

    // 4. Llamar a Ollama
    const model = request.model || process.env.DEFAULT_MODEL || 'qwen2.5:3b';
    const ollamaResponse = await fetch(`${OLLAMA_URI}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        options: {
          temperature: request.temperature || 0.2,
          num_predict: request.max_tokens || 450,
        },
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama HTTP ${ollamaResponse.status}: ${await ollamaResponse.text()}`);
    }

    const result = await ollamaResponse.json();
    let assistantContent = result.message?.content;
    const latencyMs = Date.now() - startTime;
    const modelUsed = result.model || model;

    if (!assistantContent) {
      throw new Error('Ollama returned empty response');
    }

    // 5. Detectar y extraer sugerencias (marcador <!--SUGGESTION:...-->)
    const suggestionMatch = assistantContent.match(/<!--SUGGESTION:(.*?)-->/s);
    if (suggestionMatch) {
      try {
        const suggestion = JSON.parse(suggestionMatch[1]);
        await supabase.rpc('ai_save_suggestion', {
          p_conversation_id: request.conversation_id,
          p_message_id: request.latest_user_message_id,
          p_user_id: request.user_id,
          p_content: suggestion.content,
          p_category: suggestion.category || 'other',
          p_context_summary: `Modo: ${request.mode}, Perfil: ${context.access_level}`,
        });
        console.log(`[suggestion] saved: ${suggestion.content?.slice(0, 60)}`);
      } catch (e) {
        console.warn('[suggestion] parse error, skipping:', e.message);
      }
      // Limpiar marcador del mensaje visible
      assistantContent = assistantContent.replace(/<!--SUGGESTION:.*?-->/s, '').trim();
    }

    // 6. Guardar respuesta del asistente
    const { error: saveErr } = await supabase.rpc('ai_add_assistant_message', {
      p_conversation_id: request.conversation_id,
      p_content: assistantContent,
      p_mode: request.mode,
      p_metadata: {
        request_id: request.id,
        mode: request.mode,
        model: modelUsed,
        latency_ms: latencyMs,
        processor: 'alb357',
        access_level: context.access_level,
      },
    });
    if (saveErr) throw new Error(`Save message error: ${saveErr.message}`);

    // 7. Marcar request completado
    const { error: completeErr } = await supabase.rpc('ai_complete_chat_request', {
      p_request_id: request.id,
      p_lock_owner: LOCK_OWNER,
      p_latency_ms: latencyMs,
      p_model: modelUsed,
      p_processed_by: LOCK_OWNER,
    });
    if (completeErr) throw new Error(`Complete error: ${completeErr.message}`);

    console.log(`[ok] ${modelUsed} ${latencyMs}ms${suggestionMatch ? ' +suggestion' : ''}`);
  } catch (err) {
    console.error(`[error] request=${request.id}:`, err.message);
    await supabase.rpc('ai_fail_chat_request', {
      p_request_id: request.id,
      p_error: err.message || 'Unknown error',
    }).catch(() => {});
  }
}
