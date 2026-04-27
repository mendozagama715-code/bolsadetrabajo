import logoUrl from "@/assets/logo-uiepch.png";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-crema flex items-center justify-center shrink-0 overflow-hidden p-0.5">
        <img
          src={logoUrl}
          alt="Logo Universidad Interserrana del Estado de Puebla Chilchotla"
          className="w-full h-full object-contain"
        />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-sm font-semibold text-white">Bolsa de Trabajo</div>
          <div className="text-[10px] text-crema/90">Universidad Interserrana del Estado de Puebla Chilchotla</div>
        </div>
      )}
    </div>
  );
}
