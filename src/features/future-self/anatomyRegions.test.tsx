import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  ANATOMY_SEXES,
  MUSCLE_GROUPS,
  ORGAN_GROUPS,
  assetKeysForSex,
  muscleRegion,
  regionZone,
} from './anatomyRegions';
import { AnatomyModeSwitch, BodyFigure, useAnatomy } from './BodyFigure';
import { useApp } from '../../app/store';

afterEach(() => {
  cleanup();
  useApp.getState().selectCrew('elena');
  useAnatomy.setState({ mode: 'muscles', sex: 'female' });
});

async function loadPublicGlb(fileName: string): Promise<THREE.Group> {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const fsMod = (await import(/* @vite-ignore */ `${'node:'}fs`)) as {
    default: { readFileSync: (p: string) => Uint8Array };
  };
  const buf = fsMod.default.readFileSync(`public/anatomy/${fileName}`);
  const ab = new Uint8Array(buf).buffer;
  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) =>
    loader.parse(ab, '', resolve, reject),
  );
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}

describe('Female and male 3D anatomy models', () => {
  it('maps female and male asset keys for muscles, organs and skin', () => {
    expect(ANATOMY_SEXES).toEqual(['female', 'male']);
    expect(assetKeysForSex('muscles', 'female')).toEqual({ layer: 'muscles-female', skin: 'skin-female' });
    expect(assetKeysForSex('organs', 'female')).toEqual({ layer: 'organs-female', skin: 'skin-female' });
    expect(assetKeysForSex('muscles', 'male')).toEqual({ layer: 'muscles', skin: 'skin' });
    expect(assetKeysForSex('organs', 'male')).toEqual({ layer: 'organs', skin: 'skin' });
  });

  it('classifies muscle regions consistently across all 6 groups', () => {
    expect(muscleRegion('frontalis muscle', 0, 0.92, 0.04)).toBe('headNeck');
    expect(muscleRegion('pectoralis major muscle', 0.06, 0.77, 0.02)).toBe('chest');
    expect(muscleRegion('serratus anterior muscle', 0.06, 0.75, -0.03)).toBe('chest');
    expect(muscleRegion('trapezius muscle', 0.05, 0.80, -0.05)).toBe('back');
    expect(muscleRegion('rectus abdominis muscle', 0.03, 0.62, 0.05)).toBe('core');
    expect(muscleRegion('biceps brachii muscle', 0.16, 0.72, 0.01)).toBe('arms');
    expect(muscleRegion('opponens pollicis muscle', 0.22, 0.46, 0.02)).toBe('arms');
    expect(muscleRegion('gluteus maximus muscle', 0.08, 0.49, -0.06)).toBe('legs');
    expect(regionZone('muscles', 'chest')).toBe('muscles');
    expect(regionZone('organs', 'heart')).toBe('heart');
  });

  it('loads the 3D female GLB models with valid dimensions, all 6 muscle groups, all 5 organ groups, and no intimate organs', async () => {
    const [skin, muscles, organs] = await Promise.all([
      loadPublicGlb('skin-female.glb'),
      loadPublicGlb('muscles-female.glb'),
      loadPublicGlb('organs-female.glb'),
    ]);

    const bounds = new THREE.Box3().setFromObject(skin);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2 / size.y;

    // Authentic female stature (~1.66 m) normalized to height 2.0 in scene space
    expect(size.y).toBeGreaterThan(1.55);
    expect(size.y).toBeLessThan(1.75);
    expect(size.y * scale).toBeCloseTo(2, 5);

    const muscleCounts: Record<string, number> = {};
    const intimateRegex = /uterus|ovary|vagina|fallopian|cervix|prostate|testis|penis|scrotum/i;

    muscles.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      let node: THREE.Object3D | null = obj;
      while (node && !node.userData.zone) node = node.parent;
      expect(node?.userData.zone).toBe('muscles');
      const name = String(node?.userData.anatomyName ?? obj.name);
      expect(intimateRegex.test(name)).toBe(false);
      const pos = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
      const r = muscleRegion(
        name.toLowerCase(),
        ((pos.x - center.x) * scale) / 2,
        ((pos.y - bounds.min.y) * scale) / 2,
        ((pos.z - center.z) * scale) / 2,
      );
      muscleCounts[r] = (muscleCounts[r] ?? 0) + 1;
    });

    for (const group of MUSCLE_GROUPS) {
      expect(muscleCounts[group]).toBeGreaterThan(0);
    }

    const organCounts: Record<string, number> = {};
    organs.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      let node: THREE.Object3D | null = obj;
      while (node && !node.userData.zone) node = node.parent;
      expect(node?.userData.zone).toBeDefined();
      const name = String(node?.userData.anatomyName ?? obj.name);
      expect(intimateRegex.test(name)).toBe(false);
      const zone = String(node?.userData.zone);
      organCounts[zone] = (organCounts[zone] ?? 0) + 1;
    });

    for (const group of ORGAN_GROUPS) {
      expect(organCounts[group]).toBeGreaterThan(0);
    }
  });

  it('switches between female and male 3D models via the UI and syncs with crew member sex', () => {
    render(
      <div>
        <AnatomyModeSwitch />
        <BodyFigure sharedControls zones={{ heart: 'green', muscles: 'yellow' }} variant="today" title="Body today" />
      </div>,
    );

    const femaleBtn = screen.getByRole('button', { name: 'Female' });
    const maleBtn = screen.getByRole('button', { name: 'Male' });
    expect(femaleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(maleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelector('[data-anatomy="today"]')).toHaveAttribute('data-anatomy-sex', 'female');

    fireEvent.click(maleBtn);
    expect(maleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('[data-anatomy="today"]')).toHaveAttribute('data-anatomy-sex', 'male');

    // Switching crew member to Amara (female) updates the model back to female
    act(() => {
      useApp.getState().selectCrew('amara');
    });
    expect(document.querySelector('[data-anatomy="today"]')).toHaveAttribute('data-anatomy-sex', 'female');

    // Switching crew member to Mateo (male) updates the model to male
    act(() => {
      useApp.getState().selectCrew('mateo');
    });
    expect(document.querySelector('[data-anatomy="today"]')).toHaveAttribute('data-anatomy-sex', 'male');
  });
});
