// src/data/indicators.test.ts
import { describe, it, expect } from 'vitest';
import { INDICATORS } from './indicators';

describe('Indicator Definitions (Entregable 1)', () => {
  it('should have unique IDs for all indicators', () => {
    const ids = INDICATORS.map(i => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(INDICATORS.length);
  });

  it('should have at least one source and at least one risk per indicator', () => {
    INDICATORS.forEach(ind => {
      expect(ind.sources.length).toBeGreaterThan(0);
      expect(ind.risks.length).toBeGreaterThan(0);
      expect(ind.hazards.length).toBeGreaterThan(0);
    });
  });

  it('should only use official=true for sources in the allowed list', () => {
    // Allowed official URLs and labels based on prompt instructions
    const allowedOfficialUrls = [
      'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/',
      'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/',
      'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/',
      'https://www.nasa.gov/hrp/hazard-distance-from-earth/',
      'https://www.nasa.gov/reference/risk-of-hypoxia/',
      'https://www.nasa.gov/reference/risk-of-decompression-sickness/',
      'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/',
      'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/',
      'https://www.nasa.gov/hrp/hazard-gravity-fields/',
      ''
    ];
    const allowedOfficialLabels = [
      'NASA-STD-3001 Vol 2'
    ];

    INDICATORS.forEach(ind => {
      ind.sources.forEach(source => {
        if (source.official) {
          const isValidUrl = allowedOfficialUrls.includes(source.url);
          const isValidLabel = allowedOfficialLabels.includes(source.label);
          
          // It must be either in the URL list or the Label list
          expect(isValidUrl || isValidLabel).toBe(true);
        }
      });
    });
  });

  it('should include the 7 core indicators from the official challenge', () => {
    const coreIds = [
      'bp_systolic', 'bp_diastolic', 'hr_rest', 
      'glucose_fasting', 'temp_core', 'sleep_hours', 'mood'
    ];
    const indicatorIds = INDICATORS.map(i => i.id);
    
    coreIds.forEach(id => {
      expect(indicatorIds).toContain(id);
    });
  });
});
