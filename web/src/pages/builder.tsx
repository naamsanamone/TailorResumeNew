import type { NextPage } from 'next';
import Head from 'next/head';
import { useEffect } from 'react';
import BuilderLayout from '@/modules/builder/BuilderLayout';
import { useActiveSectionStore } from '@/stores/useActiveSectionStore';

const BuilderPage: NextPage = () => {
  const openTailor = useActiveSectionStore((s) => s.openTailor);

  // Auto-navigate to Tailor section when arriving from LinkedApply Pro extension
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('from') === 'linkedapply') {
        openTailor();
      }
    }
  }, [openTailor]);

  return (
    <div>
      <Head>
        <title>TailorResume — AI Resume Builder</title>
        <meta name="description" content="AI-Powered ATS Resume Builder & Tailoring Engine" />
        <link rel="icon" type="image/png" href="/icons/resume-icon.png" />
      </Head>

      <BuilderLayout />
    </div>
  );
};

export default BuilderPage;
