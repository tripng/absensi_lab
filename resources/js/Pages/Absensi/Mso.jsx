// Minimal Material Symbols placeholder. In production you'd import the real
// Material Symbols font that app.blade.php already loads via <link>.
// This component just renders the symbol name as a span so the existing CSS
// (material-symbols-outlined) kicks in.
export default function Mso({ name, className = '', size = 18 }) {
  return (
    <span
      className={`material-symbols-outlined text-[${size}px] ${className}`.trim()}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
