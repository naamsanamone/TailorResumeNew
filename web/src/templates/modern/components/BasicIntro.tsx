import { BsGlobe } from 'react-icons/bs';
import { ProfileContact } from '../atoms/ProfileContact';
import { ProfileImage } from '@/helpers/common/components/ProfileImage';
import { ProfileName } from '../atoms/ProfileName';
import { SectionSubtitle } from '../atoms/SectionSubtitle';
import { IProfiles } from '@/stores/basic.interface';
import { socialIcons } from '@/helpers/icons';

function SocialIcons({ profiles }: { profiles: IProfiles[] }) {
  return (
    <div className="social-icons flex">
      {profiles.map((profile) => {
        const Icon = socialIcons.get(profile.network);

        return (
          Icon &&
          profile.url && (
            <a
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2"
              key={profile.network}
            >
              <Icon className="h-5 w-5 bg-white" />
            </a>
          )
        );
      })}
    </div>
  );
}
export const BasicIntro = ({
  name,
  label,
  url,
  email,
  phone,
  city,
  image,
  profiles,
}: {
  name: string;
  label: string;
  url: string;
  email: string;
  phone: string;
  city: string;
  image: string;
  profiles?: IProfiles[];
}) => {
  const isProfileLinkAvailable =
    profiles &&
    profiles.some((profile) => (profile.url.length > 0 ? true : false)) &&
    !image.length;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isProfileLinkAvailable ? 'flex-end' : 'center',
        width: '100%',
        boxSizing: 'border-box',
        gap: 16,
        marginBottom: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <ProfileName name={name} />
        <SectionSubtitle label={label} />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '3px 12px',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <ProfileContact text={phone} />
          <ProfileContact text={email} />
          <ProfileContact text={city} />
          {url && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <BsGlobe style={{ flexShrink: 0 }} />
              <ProfileContact text={url} />
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <ProfileImage src={image} height="90px" width="90px" />
        {isProfileLinkAvailable && <SocialIcons profiles={profiles} />}
      </div>
    </div>
  );
};
