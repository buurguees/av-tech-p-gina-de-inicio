import { cn } from "@/lib/utils";
import "../../styles/components/common/user-info.css";

interface UserInfoProps {
  name: string;
  role?: string | string[];
  align?: "left" | "right" | "center";
  className?: string;
  nameClassName?: string;
  roleClassName?: string;
}

export default function UserInfo({
  name,
  role,
  align = "right",
  className,
  nameClassName,
  roleClassName,
}: UserInfoProps) {
  // Formatear el rol: si es array, unirlo con comas; si es string, usarlo directamente
  const roleText = Array.isArray(role) ? role.join(", ") : role;

  return (
    <div
      className={cn(
        "user-info",
        `user-info--align-${align}`,
        className
      )}
    >
      <p className={cn("user-info__name", nameClassName)}>
        {name}
      </p>
      {roleText && (
        <p className={cn("user-info__role", roleClassName)}>
          {roleText}
        </p>
      )}
    </div>
  );
}
