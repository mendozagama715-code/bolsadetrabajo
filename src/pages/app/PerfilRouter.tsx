import { useAuth } from "@/lib/auth-context";
import PerfilEgresado from "./egresado/Perfil";
import PerfilEmpresa from "./empresa/PerfilEmpresa";
import Placeholder from "./Placeholder";

export default function PerfilRouter() {
  const { role } = useAuth();
  if (role === "egresado") return <PerfilEgresado />;
  if (role === "empresa") return <PerfilEmpresa />;
  return <Placeholder title="Mi perfil" subtitle="Edita tu información personal" />;
}
