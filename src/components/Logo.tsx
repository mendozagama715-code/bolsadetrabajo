export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-crema flex items-center justify-center font-display text-[10px] font-bold text-vino-dark shrink-0">
        UIEPCh
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
