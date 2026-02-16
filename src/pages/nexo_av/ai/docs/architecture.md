# NEXO AI — Arquitectura V1

## Flujo Asíncrono

```
Usuario → ai_add_user_message (RPC)
       → ai_create_chat_request (RPC, status=queued)
       → invoke Edge Function ai-chat-processor
       
Edge Function:
  1. Valida JWT (getClaims)
  2. Marca request → processing
  3. Carga mensaje + contexto (RPC según mode)
  4. Genera respuesta template V1
  5. Guarda via ai_add_assistant_message (service_role)
  6. Marca request → done
  
Realtime (ai.messages INSERT) → Frontend actualiza chat
```

## Schema `ai`

- `ai.conversations` — Conversaciones personales y departamentales
- `ai.conversation_members` — Miembros de conversaciones departamentales
- `ai.messages` — Mensajes con campo `mode` para trazabilidad
- `ai.chat_requests` — Cola de trabajo asíncrona

## Seguridad

- Edge Function: `verify_jwt = false` en config, validación en código via `getClaims()`
- RLS: `internal.get_authorized_user_id(auth.uid())` + `internal.is_admin()` + `internal.is_manager()`
- `ai_add_assistant_message`: SECURITY DEFINER, solo callable con service_role

## Preparación V2 (ALB357)

En V2, ALB357 (Ollama) escuchará `ai.chat_requests` con `status=queued` via Realtime.
Generará respuestas con LLM y llamará `ai_add_assistant_message`.
El frontend NO cambia: sigue escuchando Realtime en `ai.messages`.

La Edge Function V1 actúa como "stub processor" que se puede desactivar cuando ALB357 esté listo.
