import { APP_NAME } from '../config';

export default function Logo({ size = 28 }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#0E1A2B" />
        <rect x="14" y="22" width="26" height="8" rx="4" fill="#FFD84D" />
        <rect x="14" y="34" width="36" height="8" rx="4" fill="#F3F6FA" />
      </svg>
      <span>{APP_NAME}</span>
    </span>
  );
}
