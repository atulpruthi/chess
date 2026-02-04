type IconProps = {
  className?: string;
  title?: string;
};

export function IconMagnifier({ className, title = 'Find match' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="11" cy="11" r="7" fill="#22D3EE" />
      <circle cx="11" cy="11" r="4" fill="#0EA5E9" />
      <path
        d="M16.6 16.6L21 21"
        stroke="#A78BFA"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M6.6 11c0-2.5 2-4.4 4.4-4.4"
        stroke="#FFFFFF"
        strokeOpacity="0.75"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlus({ className, title = 'Create' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="18" height="18" rx="6" fill="#34D399" />
      <path
        d="M12 7v10M7 12h10"
        stroke="#064E3B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M6.5 6.8c1.6-1.5 3.6-2.3 5.9-2.3"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconGlobe({ className, title = 'Online' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" fill="#60A5FA" />
      <path
        d="M3.7 10.2c2.1 1 5 1.6 8.3 1.6s6.2-.6 8.3-1.6"
        stroke="#0B3A1F"
        strokeOpacity="0.25"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 3c2.8 2.6 4.5 6 4.5 9s-1.7 6.4-4.5 9c-2.8-2.6-4.5-6-4.5-9S9.2 5.6 12 3Z"
        fill="#34D399"
        fillOpacity="0.95"
      />
      <path
        d="M4.5 14.2c2.2-1.2 5-1.9 7.5-1.9s5.3.7 7.5 1.9"
        stroke="#1D4ED8"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconChessboard({ className, title = 'Local game' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" fill="#A78BFA" />
      <g opacity="0.9">
        <path d="M7 7h3v3H7V7Z" fill="#FDE68A" />
        <path d="M10 10h3v3h-3v-3Z" fill="#FDE68A" />
        <path d="M13 7h3v3h-3V7Z" fill="#FDE68A" />
        <path d="M7 13h3v3H7v-3Z" fill="#FDE68A" />
        <path d="M13 13h3v3h-3v-3Z" fill="#FDE68A" />
      </g>
      <path
        d="M7.5 18.5h9"
        stroke="#3B0764"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

export function IconRobot({ className, title = 'Play vs bot' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="5" y="7" width="14" height="12" rx="5" fill="#FB7185" />
      <rect x="8" y="10" width="3.5" height="3" rx="1.5" fill="#0F172A" />
      <rect x="12.5" y="10" width="3.5" height="3" rx="1.5" fill="#0F172A" />
      <path
        d="M9 15.5c1 .9 2.1 1.3 3 1.3s2-.4 3-1.3"
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 7V4"
        stroke="#FDE68A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="3.5" r="1.2" fill="#FDE68A" />
    </svg>
  );
}
