import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { BodyZone } from '../../domain/types';
import type { ZoneFill } from './BodyFigure';

export interface AnatomyPart { id: string; name: string; zone: BodyZone }
type Props = {
  mode: 'muscles' | 'organs';
  zones: Partial<Record<BodyZone, ZoneFill>>;
  selected?: BodyZone | null;
  part: string;
  title: string;
  reset: number;
  isolate: boolean;
  onParts: (parts: AnatomyPart[]) => void;
  onPick: (part: AnatomyPart) => void;
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

export default function AnatomyCanvas(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const sceneRef = useRef<{ meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[]; render: () => void; home: () => void } | null>(null);
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
    const meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
    const render = () => { if (!disposed) renderer.render(scene, camera); };
    const home = () => {
      controls.target.set(0, 0, 0);
      camera.position.set(0, 0.05, Math.max(3.5, 1.4 / camera.aspect));
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
    const down = (event: PointerEvent) => start.set(event.clientX, event.clientY);
    const up = (event: PointerEvent) => {
      if (start.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObjects(meshes.filter((mesh) => mesh.visible), false)[0];
      if (hit) latest.current.onPick(hit.object.userData.part as AnatomyPart);
    };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointerup', up);
    const lost = (event: Event) => { event.preventDefault(); latest.current.onReady('error'); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    loadModel(props.mode).then((source) => {
      if (disposed) return;
      const group = source.clone(true);
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        let node: THREE.Object3D | null = object;
        while (node && !node.userData.zone) node = node.parent;
        if (!node) { object.visible = false; return; }
        const name = String(node.userData.anatomyName).replace(/\.([lr])$/, ' ($1)').replace(/_/g, ' ');
        const part = { id: node.uuid, name, zone: node.userData.zone as BodyZone };
        object.userData.part = part;
        object.material = new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0, side: THREE.DoubleSide });
        meshes.push(object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>);
      });
      const bounds = new THREE.Box3().setFromObject(group);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 2 / Math.max(size.x, size.y, size.z);
      group.scale.multiplyScalar(scale);
      group.position.sub(center.multiplyScalar(scale));
      scene.add(group);
      sceneRef.current = { meshes, render, home };
      resize();
      home();
      latest.current.onParts([...new Map(meshes.map((mesh) => [mesh.userData.part.id, mesh.userData.part as AnatomyPart])).values()].sort((a, b) => a.name.localeCompare(b.name)));
      latest.current.onReady('ready');
      setVersion((v) => v + 1);
    }).catch(() => { if (!disposed) latest.current.onReady('error'); });
    return () => {
      disposed = true;
      sceneRef.current = null;
      observer.disconnect();
      controls.dispose();
      meshes.forEach((mesh) => mesh.material.dispose());
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.mode]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const mesh of scene.meshes) {
      const part = mesh.userData.part as AnatomyPart;
      const status = props.zones[part.zone] ?? 'none';
      const chosen = props.part ? part.id === props.part : props.selected === part.zone;
      mesh.visible = !props.isolate || !props.part || part.id === props.part;
      const natural = props.mode === 'muscles' ? '#be625c' : ({ brain: '#dfb4ae', heart: '#ae464d', lungs: '#e1a2ac', gut: '#d3976b', eyes: '#e6e6df' } as Partial<Record<BodyZone, string>>)[part.zone] ?? COLORS.none;
      mesh.material.color.set(status === 'none' || status === 'green' ? natural : COLORS[status]);
      mesh.material.emissive.set(chosen ? '#2b79b8' : '#000000');
      mesh.material.emissiveIntensity = chosen ? 0.5 : 0;
    }
    scene.render();
  }, [props.zones, props.selected, props.part, props.isolate, props.mode, version]);
  useEffect(() => { sceneRef.current?.home(); }, [props.reset]);
  return <div ref={host} role="img" aria-label={props.title} className="h-full min-h-64 w-full" />;
}
