import { useCallback, useState, useEffect } from "react";
import { saveFrontPageContentWithSync } from "../lib/hybridStorage";

export interface SocialLink {
  label: string;
  url: string;
  icon: string;
}

export interface EmergencyContact {
  doctorName: string;
  whatsappNumber: string;
  prefilledMessage: string;
}

export interface HeroSection {
  taglineEn: string;
  taglineBn: string;
  subheadingEn: string;
  subheadingBn: string;
  heroTaglineEn?: string;
  heroTaglineBn?: string;
  heroDescriptionEn?: string;
  heroDescriptionBn?: string;
  cta1Label: string;
  cta2Label: string;
}

export interface AboutSection {
  visible: boolean;
  clinicNameEn: string;
  clinicNameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  yearsExperience: number;
  patientCount: string;
  doctorCount: number;
  specialties: string[];
  affiliations: string[];
}

export interface FooterSection {
  addressEn: string;
  addressBn: string;
  phone: string;
  email: string;
  openingHours: string;
  copyrightText: string;
  socialLinks: SocialLink[];
}

export interface SiteConfig {
  heroSection: HeroSection;
  aboutSection: AboutSection;
  footerSection: FooterSection;
  emergencyContacts: EmergencyContact[];
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  heroSection: {
    taglineEn: "Dr. Arman Kabir's Care",
    taglineBn: "ডা. আরমান কবিরের চেম্বার",
    subheadingEn: "Advanced Healthcare With a Human Touch",
    subheadingBn: "মানবিক স্পর্শে উন্নত স্বাস্থ্যসেবা",
    heroTaglineEn: "Healing with Trust and Compassion",
    heroTaglineBn: "বিশ্বাস ও সহানুভূতির সাথে নিরাময়",
    heroDescriptionEn:
      "Expert diagnosis, compassionate treatment, and trusted care for every stage of life.",
    heroDescriptionBn:
      "জীবনের প্রতিটি পর্যায়ে বিশেষজ্ঞ রোগ নির্ণয়, সহানুভূতিশীল চিকিৎসা ও বিশ্বস্ত সেবা।",
    cta1Label: "Book Appointment",
    cta2Label: "Emergency",
  },
  aboutSection: {
    visible: true,
    clinicNameEn: "Dr. Arman Kabir's Care",
    clinicNameBn: "ডা. আরমান কবিরের চেম্বার",
    descriptionEn:
      "Comprehensive patient management and medical education serving patients and students across Bangladesh.",
    descriptionBn:
      "বাংলাদেশ জুড়ে রোগী ও শিক্ষার্থীদের জন্য পূর্ণাঙ্গ রোগী ব্যবস্থাপনা ও চিকিৎসা শিক্ষা।",
    yearsExperience: 10,
    patientCount: "500+",
    doctorCount: 2,
    specialties: [
      "Internal Medicine",
      "Respiratory Medicine",
      "Diabetes & Endocrinology",
      "General Practice",
    ],
    affiliations: [
      "BSMMU",
      "DMCH",
      "Dhaka Medical College",
      "National Institute of Diseases of Chest & Hospital",
    ],
  },
  footerSection: {
    addressEn: "Dhaka, Bangladesh",
    addressBn: "ঢাকা, বাংলাদেশ",
    phone: "+880-1751-959262",
    email: "dr.armankabir011@gmail.com",
    openingHours: "Sat–Thu: 9 AM – 8 PM",
    copyrightText: "Dr. Arman Kabir's Care. All rights reserved.",
    socialLinks: [],
  },
  emergencyContacts: [
    {
      doctorName: "Dr. Arman Kabir",
      whatsappNumber: "8801751959262",
      prefilledMessage: "Hello Dr. Arman, I need an emergency consultation.",
    },
    {
      doctorName: "Dr. Samia Shikder",
      whatsappNumber: "8801957212210",
      prefilledMessage: "Hello Dr. Samia, I need an emergency consultation.",
    },
  ],
};

const STORAGE_KEY = "siteConfig";

function deepMerge<T extends object>(base: T, overrides: Partial<T>): T {
  const result = { ...base } as T;
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const val = overrides[key];
    if (Array.isArray(val)) {
      (result as Record<string, unknown>)[key as string] = val;
    } else if (
      val !== null &&
      val !== undefined &&
      typeof val === "object" &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      (result as Record<string, unknown>)[key as string] = deepMerge(
        result[key] as object,
        val as object,
      );
    } else if (val !== undefined) {
      (result as Record<string, unknown>)[key as string] = val;
    }
  }
  return result;
}

function loadConfig(): SiteConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_CONFIG;
    return deepMerge(
      DEFAULT_SITE_CONFIG,
      JSON.parse(raw) as Partial<SiteConfig>,
    );
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

function saveConfig(cfg: SiteConfig, actor?: unknown) {
  // Always save to localStorage for offline access
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  
  // Also sync to backend via API if available
  syncToBackendAPI(cfg);
  
  // And sync to canister
  saveFrontPageContentWithSync(actor ?? null);
}

// Helper: sync configuration to backend API
async function syncToBackendAPI(cfg: SiteConfig) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // Not logged in, skip backend sync
      return;
    }

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    // Sync each section to backend
    const sections: Array<{section: keyof SiteConfig; data: unknown}> = [
      { section: 'heroSection', data: cfg.heroSection },
      { section: 'aboutSection', data: cfg.aboutSection },
      { section: 'footerSection', data: cfg.footerSection },
      { section: 'emergencyContacts', data: cfg.emergencyContacts },
    ];

    for (const { section, data } of sections) {
      try {
        await fetch(`${backendUrl}/api/config/${section}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            config: data,
            reason: 'Updated via admin panel',
          }),
        });
      } catch (err) {
        console.warn(`[sync] Failed to sync ${section} to backend:`, err);
        // Don't fail if backend sync fails - localStorage is the source of truth
      }
    }
  } catch (err) {
    console.warn('[sync] Failed to sync config to backend:', err);
  }
}

// Helper: fetch configuration from backend
async function fetchConfigFromBackend(): Promise<Partial<SiteConfig> | null> {
  try {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/api/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[sync] Failed to fetch config from backend:', response.status);
      return null;
    }

    const data = await response.json() as Record<string, unknown>;
    return data as Partial<SiteConfig>;
  } catch (err) {
    console.warn('[sync] Failed to fetch config from backend:', err);
    return null;
  }
}

// Helper: resolve canister actor at call time (avoids import cycle)
function resolveActor(): unknown | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../hooks/useQueries") as {
      getCanisterActor?: () => unknown;
    };
    return mod.getCanisterActor?.() ?? null;
  } catch {
    return null;
  }
}

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(loadConfig);

  // On mount, try to sync from backend
  useEffect(() => {
    const syncFromBackend = async () => {
      const backendConfig = await fetchConfigFromBackend();
      if (backendConfig) {
        // Merge backend config with local config
        const merged = deepMerge(config, backendConfig);
        setConfig(merged);
        // Update localStorage with backend data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    };

    syncFromBackend();
  }, []);

  const updateHero = useCallback((hero: Partial<HeroSection>) => {
    setConfig((prev) => {
      const next = { ...prev, heroSection: { ...prev.heroSection, ...hero } };
      saveConfig(next, resolveActor());
      return next;
    });
  }, []);

  const updateAbout = useCallback((about: Partial<AboutSection>) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        aboutSection: { ...prev.aboutSection, ...about },
      };
      saveConfig(next, resolveActor());
      return next;
    });
  }, []);

  const updateFooter = useCallback((footer: Partial<FooterSection>) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        footerSection: { ...prev.footerSection, ...footer },
      };
      saveConfig(next, resolveActor());
      return next;
    });
  }, []);

  const updateEmergencyContacts = useCallback(
    (contacts: EmergencyContact[]) => {
      setConfig((prev) => {
        const next = { ...prev, emergencyContacts: contacts };
        saveConfig(next, resolveActor());
        return next;
      });
    },
    [],
  );

  const resetSection = useCallback((section: keyof SiteConfig) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        [section]: DEFAULT_SITE_CONFIG[section],
      };
      saveConfig(next, resolveActor());
      return next;
    });
  }, []);

  return {
    config,
    updateHero,
    updateAbout,
    updateFooter,
    updateEmergencyContacts,
    resetSection,
  };
}
