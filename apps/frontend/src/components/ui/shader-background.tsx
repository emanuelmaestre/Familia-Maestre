export function ShaderBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        background: 'linear-gradient(160deg, #eaf3ff 0%, #f4f8ff 40%, #ffffff 70%, #e8f0fb 100%)',
        pointerEvents: 'none',
      }}
    />
  );
}
