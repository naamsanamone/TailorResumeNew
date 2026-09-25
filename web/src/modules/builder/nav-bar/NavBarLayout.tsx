import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { NavBarActions, NavBarMenu, StyledButton } from './atoms';
import {
  useDatabases,
  useFrameworks,
  useLanguages,
  useLibraries,
  usePractices,
  useTechnologies,
  useTools,
} from '@/stores/skills';

import { AVAILABLE_TEMPLATES } from '@/helpers/constants';
import DEFAULT_RESUME_JSON from '@/helpers/constants/resume-data.json';
import Image from '@/helpers/common/components/Image';
import Link from 'next/link';
import { NavMenuItem } from './components/MenuItem';
import { PrintResume } from './components/PrintResume';
import { TemplateSelect } from './components/TemplateSelect';
import { ThemeSelect } from './components/ThemeSelect';
import { Toast } from '@/helpers/common/atoms/Toast';
import exportFromJSON from 'export-from-json';
import { useActivity } from '@/stores/activity';
import { useAwards } from '@/stores/awards';
import { useBasicDetails } from '@/stores/basic';
import { useEducations } from '@/stores/education';
import { useExperiences } from '@/stores/experience';
import { useVoluteeringStore } from '@/stores/volunteering';
import { Menu, MenuItem } from '@mui/material';
import { useActiveSectionStore } from '@/stores/useActiveSectionStore';
import { applyImportedResumeJson } from './applyImportedResume';
import { fetchAndApplyResumeFromUrl, formatImportUrlError } from './fetchResumeFromUrl';
import ResumeUploadModal from './components/ResumeUploadModal';

const TOTAL_TEMPLATES_AVAILABLE = Object.keys(AVAILABLE_TEMPLATES).length;

const NavBarLayout = () => {
  const router = useRouter();
  const importUrlFromQuery = router.query.importUrl;
  const [openToast, setOpenToast] = useState(false);
  const [toastContent, setToastContent] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  /** Auto-import when opening `/builder?importUrl=<encoded JSON URL>` (param removed after attempt). */
  useEffect(() => {
    if (!router.isReady) return;
    const param =
      typeof importUrlFromQuery === 'string'
        ? importUrlFromQuery
        : Array.isArray(importUrlFromQuery)
          ? importUrlFromQuery[0]
          : undefined;
    if (!param) return;

    let active = true;

    void (async () => {
      try {
        await fetchAndApplyResumeFromUrl(param);
        if (!active) return;
        setToastContent('Resume data was successfully imported.');
        setOpenToast(true);
      } catch (e) {
        if (!active) return;
        setToastContent(formatImportUrlError(e));
        setOpenToast(true);
      }
      if (!active) return;
      const nextQuery = { ...router.query };
      delete nextQuery.importUrl;
      void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
        shallow: true,
      });
    })();

    return () => {
      active = false;
    };
  }, [router, router.isReady, router.pathname, importUrlFromQuery]);

  useEffect(() => {
    const closeMobileMenu = () => setMenuAnchor(null);
    globalThis.addEventListener('beforeprint', closeMobileMenu);
    return () => globalThis.removeEventListener('beforeprint', closeMobileMenu);
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const exportResumeData = useCallback(() => {
    const updatedResumeJson = {
      ...DEFAULT_RESUME_JSON,
      basics: {
        ...DEFAULT_RESUME_JSON.basics,
        ...useBasicDetails.getState().values,
      },
      work: useExperiences.getState().experiences,
      education: useEducations.getState().academics,
      awards: useAwards.getState().awards,
      volunteer: useVoluteeringStore.getState().volunteeredExps,
      skills: {
        languages: useLanguages.getState().get(),
        frameworks: useFrameworks.getState().get(),
        technologies: useTechnologies.getState().get(),
        libraries: useLibraries.getState().get(),
        databases: useDatabases.getState().get(),
        practices: usePractices.getState().get(),
        tools: useTools.getState().get(),
      },
      activities: useActivity.getState().activities,
    };
    const fileName = updatedResumeJson.basics.name + '_' + new Date().toLocaleString();
    const exportType = exportFromJSON.types.json;
    exportFromJSON({
      data: updatedResumeJson,
      fileName,
      exportType,
    });
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) {
      return;
    }

    const reader = new FileReader();

    reader.readAsText(fileObj);

    event.target.value = ''; // To read the same file

    reader.onload = (e) => {
      try {
        if (typeof e.target?.result === 'string') {
          applyImportedResumeJson(JSON.parse(e.target.result));
          setToastContent('Resume data was successfully imported.');
          setOpenToast(true);
        }
      } catch {
        setToastContent('Could not read resume JSON from file.');
        setOpenToast(true);
      }
    };
  }, []);

  return (
    <nav className="h-14 w-full bg-[#0c101d] border-b border-indigo-500/20 relative flex py-2.5 pl-2 md:pl-5 pr-1 md:pr-4 items-center shadow-lg shadow-black/30 z-20 print:hidden">
      <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
        <Image
          src="/icons/linkedapply-logo.png"
          alt="LinkedApply Pro"
          height={34}
          width={34}
          className="rounded-xl shadow-md ring-1 ring-white/10 group-hover:scale-105 transition-transform"
        />
        <div className="hidden sm:flex items-center gap-1.5 select-none">
          <span className="font-extrabold text-base tracking-tight text-white">
            LinkedApply
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm shadow-indigo-500/30">
            PRO
          </span>
        </div>
      </Link>
      <div className="flex-auto flex justify-between items-center xs:ml-3 md:ml-6">
        <NavBarMenu>
          <NavMenuItem
            caption={`Templates (${TOTAL_TEMPLATES_AVAILABLE})`}
            popoverChildren={<TemplateSelect />}
          />
          <NavMenuItem caption="Colours" popoverChildren={<ThemeSelect />} />
        </NavBarMenu>
        <div className="hidden md:flex">
          <NavBarActions>
            <StyledButton variant="text" onClick={() => setIsUploadOpen(true)}>
              Upload Resume
            </StyledButton>
            <button
              onClick={() => useActiveSectionStore.getState().openTailor()}
              className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-md shadow-indigo-500/25 border border-indigo-400/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              Tailor Resume
            </button>
            <StyledButton variant="text" onClick={exportResumeData}>
              Export
            </StyledButton>
            <StyledButton
              variant="text"
              onClick={() => {
                if (fileInputRef.current) {
                  const fileElement = fileInputRef.current as HTMLInputElement;
                  fileElement.click();
                }
              }}
            >
              Import{' '}
              <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="application/json"
                onChange={handleFileChange}
              />
            </StyledButton>
            <PrintResume />
          </NavBarActions>
        </div>
        <button
          className="flex md:hidden text-white"
          onClick={handleMenuOpen}
          aria-label="Open menu"
        >
          <Image src="/icons/more-horizontal.svg" alt="back" width={25} height={25} />
        </button>
      </div>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => {
            setIsUploadOpen(true);
            handleMenuClose();
          }}
        >
          Upload Resume
        </MenuItem>
        <MenuItem
          onClick={() => {
            useActiveSectionStore.getState().openTailor();
            handleMenuClose();
          }}
        >
          Tailor Resume
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportResumeData();
            handleMenuClose();
          }}
        >
          Export
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (fileInputRef.current) {
              const fileElement = fileInputRef.current as HTMLInputElement;
              fileElement.click();
            }
            handleMenuClose();
          }}
        >
          Import
          <input
            type="file"
            hidden
            ref={fileInputRef}
            accept="application/json"
            onChange={handleFileChange}
          />
        </MenuItem>
        <PrintResume isMenuButton />
      </Menu>
      <Toast
        open={openToast}
        onClose={() => {
          setOpenToast(false);
        }}
        content={toastContent}
      />
      <ResumeUploadModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          setToastContent('Resume uploaded and loaded successfully!');
          setOpenToast(true);
        }}
      />
    </nav>
  );
};

export default NavBarLayout;
