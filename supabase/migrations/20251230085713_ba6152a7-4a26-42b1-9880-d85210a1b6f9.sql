-- Crear función para insertar mensajes de contacto (accesible via RPC)
CREATE OR REPLACE FUNCTION public.insert_contact_message(
    _nombre TEXT,
    _empresa TEXT,
    _email TEXT,
    _telefono TEXT,
    _tipo_solicitud TEXT,
    _tipo_espacio TEXT,
    _mensaje TEXT,
    _ip_address INET DEFAULT NULL,
    _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, crm
AS $$
DECLARE
    _message_id UUID;
BEGIN
    INSERT INTO crm.contact_messages (
        nombre, empresa, email, telefono,
        tipo_solicitud, tipo_espacio, mensaje,
        ip_address, user_agent
    ) VALUES (
        _nombre, _empresa, _email, _telefono,
        _tipo_solicitud, _tipo_espacio, _mensaje,
        _ip_address, _user_agent
    )
    RETURNING id INTO _message_id;
    
    RETURN _message_id;
END;
$$;

-- Dar permisos para llamar la función
GRANT EXECUTE ON FUNCTION public.insert_contact_message TO anon, authenticated, service_role;