import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { BodyZone } from '../../domain/types';
import type { ZoneFill } from './BodyFigure';
import { muscleRegion, regionZone, type AnatomyMode, type AnatomyRegion } from './anatomyRegions';

type Props = {
  mode: AnatomyMode;
  zones: Partial<Record<BodyZone, ZoneFill>>;
  selected?: BodyZone | null;
  region: AnatomyRegion | null;
  hover: AnatomyRegion | null;
  title: string;
  reset: number;
  isolate: boolean;
  onHover: (region: AnatomyRegion | null) => void;
  onPick: (region: AnatomyRegion) => void;
  onReady: (state: 'loading' | 'ready' | 'error') => void;
};
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const models = new Map<string, Promise<THREE.Group>>();
function loadModel(mode: string) {
  if (!models.has(mode)) {
    models.set(mode, loader.loadAsync('/anatomy/' + mode + '.glb').then((gltf) => gltf.scene).catch((error) => {
      models.delete(mode);
      throw error;
    }));
  }
  return models.get(mode)!;
}
const COLORS: Record<ZoneFill, string> = { green: '#80c79d', yellow: '#edba50', red: '#ed665b', stale: '#a393bd', none: '#b9a498' };

type Surface = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
type RegionMesh = {
  surface: Surface;
  outline: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  region: AnatomyRegion;
};

function makeOutline(geometry: THREE.BufferGeometry) {
  return new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { width: { value: 0.0015 }, tint: { value: new THREE.Color() } },
    vertexShader: `
      uniform float width;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        viewPosition.xyz += normalize(normalMatrix * normal) * width;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 tint;
      void main() {
        gl_FragColor = vec4(tint, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }));
}

function makeSkinMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { tint: { value: new THREE.Color('#90b6dd') } },
    vertexShader: `
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        viewNormal = normalize(normalMatrix * normal);
        viewDirection = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      uniform vec3 tint;
      void main() {
        float rim = pow(1.0 - clamp(dot(normalize(viewNormal), normalize(viewDirection)), 0.0, 1.0), 2.5);
        gl_FragColor = vec4(tint, 0.06 + 0.58 * rim);
        #include <colorspace_fragment>
      }
    `,
  });
}

const ORGAN_COLORS: Partial<Record<AnatomyRegion, string>> = {
  brain: '#dfb4ae', heart: '#ae464d', lungs: '#e1a2ac', gut: '#d3976b', eyes: '#e6e6df',
};
const MUSCLE_COLORS: Partial<Record<AnatomyRegion, string>> = {
  headNeck: '#c08683', chest: '#bd5956', back: '#b76b69', core: '#d18a76', arms: '#c97b6b', legs: '#b96363',
};

export default function AnatomyCanvas(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const sceneRef = useRef<{ meshes: RegionMesh[]; render: () => void; home: () => void } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    latest.current.onReady('loading');
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      latest.current.onReady('error');
      return;
    }
    let disposed = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 0.3;
    controls.maxDistance = 8;
    controls.panSpeed = 0.7;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8b819c, 2.3));
    const light = new THREE.DirectionalLight(0xffffff, 2.7);
    light.position.set(2, 3, 4);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0xb6d6ff, 1.8);
    rim.position.set(-2, 1, -3);
    scene.add(rim);
    const meshes: RegionMesh[] = [];
    const skinMaterial = makeSkinMaterial();
    const render = () => { if (!disposed) renderer.render(scene, camera); };
    const home = () => {
      controls.target.set(0, 0, 0);
      camera.position.set(0, 0.05, Math.max(3.5, 1.6 / camera.aspect));
      controls.update();
      render();
    };
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    controls.addEventListener('change', render);
    const ray = new THREE.Raycaster();
    const start = new THREE.Vector2();
    let pointer: number | null = null;
    let lastHover: AnatomyRegion | null = null;
    function identify(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(
        (event.clientX - rect.left) / rect.width * 2 - 1,
        -(event.clientY - rect.top) / rect.height * 2 + 1,
      ), camera);
      const surfaces = meshes.filter(({ surface }) => surface.visible).map(({ surface }) => surface);
      return ray.intersectObjects(surfaces, false)[0]?.object.userData.region as AnatomyRegion | undefined;
    }
    function setHover(region: AnatomyRegion | null) {
      if (lastHover === region) return;
      lastHover = region;
      latest.current.onHover(region);
      renderer.domElement.style.cursor = region ? 'pointer' : 'grab';
    }
    const down = (event: PointerEvent) => {
      pointer = event.isPrimary && event.button === 0 ? event.pointerId : null;
      start.set(event.clientX, event.clientY);
      setHover(null);
      renderer.domElement.style.cursor = 'grabbing';
    };
    const up = (event: PointerEvent) => {
      const picked = pointer === event.pointerId
        && start.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) <= 5;
      pointer = null;
      const region = identify(event);
      if (picked && region) latest.current.onPick(region);
      setHover(event.pointerType === 'mouse' ? region ?? null : null);
      renderer.domElement.style.cursor = lastHover ? 'pointer' : 'grab';
    };
    const move = (event: PointerEvent) => {
      if (!event.buttons && event.pointerType === 'mouse') setHover(identify(event) ?? null);
    };
    const leave = () => setHover(null);
    const cancel = () => { pointer = null; leave(); };
    const interactions = { pointerdown: down, pointerup: up, pointermove: move, pointerleave: leave, pointercancel: cancel };
    renderer.domElement.style.cursor = 'grab';
    for (const [event, handler] of Object.entries(interactions)) renderer.domElement.addEventListener(event, handler as EventListener);
    const lost = (event: Event) => { event.preventDefault(); latest.current.onReady('error'); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    Promise.all([loadModel(props.mode), loadModel('skin')]).then(([source, skinSource]) => {
      if (disposed) return;
      const group = source.clone(true);
      group.updateMatrixWorld(true);
      const skin = skinSource.clone(true);
      const bounds = new THREE.Box3().setFromObject(skin);
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 2 / bounds.getSize(new THREE.Vector3()).y;
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        let node: THREE.Object3D | null = object;
        while (node && !node.userData.zone) node = node.parent;
        if (!node) { object.visible = false; return; }
        const position = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
        const region = props.mode === 'muscles'
          ? muscleRegion(String(node.userData.anatomyName).toLowerCase(), (position.x - center.x) * scale / 2,
            (position.y - bounds.min.y) * scale / 2, (position.z - center.z) * scale / 2)
          : node.userData.zone as AnatomyRegion;
        object.userData.region = region;
        object.material = new THREE.MeshStandardMaterial({ roughness: 0.65, side: THREE.DoubleSide });
        meshes.push({ surface: object as Surface, outline: makeOutline(object.geometry), region });
      });
      // Add outlines after traversing so the raycaster only sees the actual anatomy.
      for (const { surface, outline } of meshes) surface.add(outline);
      skin.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material = skinMaterial;
          object.renderOrder = 2;
        }
      });
      const frame = new THREE.Group();
      frame.add(group, skin);
      frame.scale.setScalar(scale);
      frame.position.copy(center.multiplyScalar(-scale));
      scene.add(frame);
      sceneRef.current = { meshes, render, home };
      resize();
      home();
      latest.current.onReady('ready');
      setVersion((v) => v + 1);
    }).catch(() => { if (!disposed) latest.current.onReady('error'); });
    return () => {
      disposed = true;
      sceneRef.current = null;
      observer.disconnect();
      controls.dispose();
      for (const { surface, outline } of meshes) {
        surface.material.dispose();
        outline.material.dispose();
      }
      skinMaterial.dispose();
      for (const [event, handler] of Object.entries(interactions)) renderer.domElement.removeEventListener(event, handler as EventListener);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.mode]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const { surface, outline, region } of scene.meshes) {
      const zone = regionZone(props.mode, region);
      const status = props.zones[zone] ?? 'none';
      const chosen = props.region === region || (!props.region && props.mode === 'organs' && props.selected === zone);
      const hovered = props.hover === region;
      surface.visible = !props.isolate || !props.region || props.region === region;
      const natural = (props.mode === 'muscles' ? MUSCLE_COLORS[region] : ORGAN_COLORS[region]) ?? COLORS.none;
      surface.material.color.set(natural);
      if (status !== 'none') surface.material.color.lerp(new THREE.Color(COLORS[status]), 0.67);
      surface.material.emissive.set(chosen || hovered ? '#286cab' : '#000000');
      surface.material.emissiveIntensity = chosen ? 0.55 : hovered ? 0.32 : 0;
      outline.material.uniforms.width.value = chosen || hovered ? 0.004 : 0.0015;
      outline.material.uniforms.tint.value.set(chosen || hovered ? '#b4e4ff' : '#725461');
    }
    scene.render();
  }, [props.zones, props.selected, props.region, props.hover, props.isolate, props.mode, version]);
  useEffect(() => { sceneRef.current?.home(); }, [props.reset]);
  return <div ref={host} role="img" aria-label={props.title} className="h-full min-h-64 w-full" />;
}
