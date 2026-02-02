export const appShellClass =
  'min-h-screen text-white ' +
  'bg-[radial-gradient(1200px_600px_at_20%_0%,rgba(168,85,247,0.20)_0%,rgba(0,0,0,0)_60%),' +
  'radial-gradient(900px_500px_at_80%_10%,rgba(59,130,246,0.16)_0%,rgba(0,0,0,0)_55%),' +
  'radial-gradient(900px_700px_at_50%_110%,rgba(16,185,129,0.10)_0%,rgba(0,0,0,0)_55%),' +
  'linear-gradient(180deg,#05060a_0%,#020205_100%)]';

export const appPageClass = `${appShellClass} p-4 md:p-8`;
export const appCenteredClass = `${appShellClass} flex items-center justify-center p-6`;

export const glassCardClass =
  'backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-3xl ' +
  'shadow-[0_10px_40px_rgba(0,0,0,0.45)]';

export const glassCardSoftClass =
  'backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-2xl';

export const buttonPrimaryClass =
  'inline-flex items-center justify-center rounded-xl bg-blue-600 text-white font-semibold ' +
  'hover:bg-blue-500 active:bg-blue-700 transition-colors';

export const buttonSecondaryClass =
  'inline-flex items-center justify-center rounded-xl bg-white/10 text-white font-semibold ' +
  'hover:bg-white/15 active:bg-white/20 transition-colors border border-white/10';

export const buttonDangerClass =
  'inline-flex items-center justify-center rounded-xl bg-red-500/15 text-red-200 font-semibold ' +
  'hover:bg-red-500/25 active:bg-red-500/30 transition-colors border border-red-500/30';
