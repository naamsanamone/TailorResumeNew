import type { ResumePalette } from '@/templates/common/resumePalette';

const serif = "'Georgia', serif";

type Profile = { network: string; username?: string; url: string };

type Basics = {
  name: string;
  label: string;
  email?: string;
  phone?: string;
  url?: string;
  location?: { city?: string };
  profiles?: Profile[];
};

export function Header({ basics, p }: { basics: Basics; p: ResumePalette }) {
  const linkedin = basics.profiles?.find((pr) => pr.network.toLowerCase() === 'linkedin');
  const github = basics.profiles?.find((pr) => pr.network.toLowerCase() === 'github');

  const contactItems = [
    basics.email,
    basics.phone,
    basics.location?.city,
    basics.url,
    linkedin ? linkedin.url : null,
    github ? github.url : null,
  ].filter(Boolean);

  return (
    <div
      style={{
        textAlign: 'center',
        borderBottom: `1px solid ${p.divider}`,
        paddingBottom: 16,
        marginBottom: 20,
      }}
    >
      <h1 style={{ fontFamily: serif, fontSize: 32, margin: 0, color: p.text }}>{basics.name}</h1>
      <div
        style={{
          fontSize: 12,
          marginTop: 6,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {basics.label}
      </div>
      <div style={{ fontSize: 10.5, color: p.muted, marginTop: 10 }}>
        {contactItems.join(' · ')}
      </div>
    </div>
  );
}

