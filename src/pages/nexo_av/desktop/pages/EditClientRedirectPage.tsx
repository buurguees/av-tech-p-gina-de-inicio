/**
 * EditClientRedirectPage - Redirige al detalle del cliente en desktop
 * En desktop, la edición se hace mediante un diálogo en ClientDetailPage
 */
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const EditClientRedirectPage = () => {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId && clientId) {
      navigate(`/nexo-av/${userId}/clients/${clientId}`, { replace: true });
    }
  }, [userId, clientId, navigate]);

  return null;
};

export default EditClientRedirectPage;
