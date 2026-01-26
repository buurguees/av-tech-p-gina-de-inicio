import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, FileText } from "lucide-react";

interface Partner {
  id: string;
  partner_number: string;
  full_name: string;
  tax_id: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  created_at: string;
}

interface PartnerCardProps {
  partner: Partner;
}

export default function PartnerCard({ partner }: PartnerCardProps) {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Card
      className="bg-card/50 border-border/50 hover:bg-card/80 hover:border-border transition-all cursor-pointer group"
      onClick={() => navigate(`/nexo-av/${userId}/partners/${partner.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold text-sm">
              {getInitials(partner.full_name)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {partner.full_name}
              </h3>
              {partner.status === "ACTIVE" ? (
                <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/30 flex-shrink-0">
                  Activo
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex-shrink-0">
                  Inactivo
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground font-mono mb-3">
              {partner.partner_number}
            </p>

            {/* Details */}
            <div className="space-y-1.5">
              {partner.tax_id && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{partner.tax_id}</span>
                </div>
              )}
              {partner.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{partner.email}</span>
                </div>
              )}
              {partner.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{partner.phone}</span>
                </div>
              )}
              {!partner.tax_id && !partner.email && !partner.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>Sin datos de contacto</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
