import { Link } from "react-router-dom";
import { PublicNav, Footer } from "@/components/PublicNav";
import { Briefcase, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="bg-vino-dark text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5 animate-fade-in">
            <span className="badge-pill bg-crema/15 text-crema border border-crema/30">Bolsa de Trabajo UIEPCh</span>
            <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight">
              Conectamos egresados con<br />
              <span className="text-crema">empresas de la región serrana</span>
            </h1>
            <p className="text-crema/85 text-base max-w-md leading-relaxed">
              Universidad Interserrana del Estado de Puebla Chilchotla. Encuentra oportunidades laborales o publica vacantes para nuestros egresados.
            </p>
            <div className="flex gap-3 pt-2">
              <Link
                to={user ? "/app" : "/auth"}
                className="inline-flex items-center gap-2 bg-crema text-vino-dark px-5 py-2.5 rounded-lg font-display text-sm font-semibold hover:bg-crema/90 transition"
              >
                {user ? "Ir a mi panel" : "Comenzar"} <ArrowRight size={16} />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 border border-crema/40 text-crema px-5 py-2.5 rounded-lg font-display text-sm font-medium hover:bg-crema/10 transition"
              >
                Soy empresa
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {[
                { n: "142", l: "Egresados" },
                { n: "28", l: "Empresas" },
                { n: "37", l: "Vacantes" },
                { n: "315", l: "Postulaciones" },
              ].map((s) => (
                <div key={s.l} className="bg-white/5 border border-crema/20 rounded-xl p-5 text-center">
                  <div className="font-display text-3xl font-bold text-crema">{s.n}</div>
                  <div className="text-[11px] uppercase tracking-wider text-crema/70 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="flex-1 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl font-semibold text-center text-foreground mb-2">¿Cómo funciona?</h2>
          <p className="text-muted-foreground text-center text-sm mb-12">Una plataforma para tres perfiles distintos</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { i: <Users className="text-primary" />, t: "Egresados", d: "Crea tu perfil, postúlate a vacantes y haz seguimiento de tus aplicaciones." },
              { i: <Briefcase className="text-primary" />, t: "Empresas", d: "Publica vacantes, revisa postulantes y agenda entrevistas con tu propio calendario." },
              { i: <ShieldCheck className="text-primary" />, t: "Administradores", d: "Valida empresas, gestiona usuarios y obtén reportes de la actividad de la bolsa." },
            ].map((f) => (
              <div key={f.t} className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-elev transition">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">{f.i}</div>
                <h3 className="font-display font-semibold text-base mb-1.5">{f.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
