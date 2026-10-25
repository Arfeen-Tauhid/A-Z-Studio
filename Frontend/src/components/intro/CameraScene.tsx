import { useLoader, useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

type Phase =
  | 'loading'
  | 'studio'
  | 'camera-reveal'
  | 'opening'
  | 'exploded'
  | 'assembling'
  | 'assembled'
  | 'branding'
  | 'camera-closeup'
  | 'fallback'

type Props = {
  onPhase: (phase: Phase) => void
  onComplete: () => void
}

const MODEL_PATH = '/models/canon-at1/canon-at1.fbx'
const STUDIO_MODEL_PATH = '/models/studio/studio.fbx'
const CAMERA_MODEL_EXTENT = 1.2
const TEXTURE_PATHS = [
  '/models/canon-at1/camera-color.png',
  '/models/canon-at1/camera-normal.png',
  '/models/canon-at1/camera-roughness.png',
  '/models/canon-at1/camera-metalness.png',
  '/models/canon-at1/camera-opacity.png',
] as const

function explosionOffset(name: string, index: number, extent: number) {
  const part = name.toLowerCase()
  const distance = Math.max(extent * 0.17, 0.22)

  if (/lens|glass|element/.test(part)) return new THREE.Vector3(0, 0, distance * 1.7)
  if (/mount/.test(part)) return new THREE.Vector3(0, 0, distance * 1.2)
  if (/sensor/.test(part)) return new THREE.Vector3(distance, 0, 0)
  if (/circuit|board|pcb/.test(part)) return new THREE.Vector3(-distance, 0, 0)
  if (/top|dial|button/.test(part)) return new THREE.Vector3(0, distance, 0)
  if (/battery|base|bottom/.test(part)) return new THREE.Vector3(0, -distance, 0)
  if (/grip/.test(part)) return new THREE.Vector3(-distance, -distance * 0.35, 0)
  if (/screw|bolt/.test(part)) {
    const direction = index % 2 === 0 ? 1 : -1
    return new THREE.Vector3(
      direction * distance * 0.7,
      distance * 0.35,
      direction * distance * 0.25,
    )
  }

  const angle = (index / Math.max(index + 1, 1)) * Math.PI * 2
  return new THREE.Vector3(
    Math.cos(angle) * distance,
    Math.sin(angle) * distance * 0.62,
    (index % 2 === 0 ? 1 : -1) * distance * 0.25,
  )
}

function Dust() {
  const points = useMemo(() => {
    const positions = new Float32Array(32 * 3)
    for (let index = 0; index < 32; index += 1) {
      positions[index * 3] = Math.sin(index * 13.37) * 4.8
      positions[index * 3 + 1] = Math.cos(index * 7.13) * 2.8
      positions[index * 3 + 2] = Math.sin(index * 3.71) * 2.4 - 1
    }
    return positions
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#58e2d0" size={0.014} sizeAttenuation transparent opacity={0.58} />
    </points>
  )
}

function OrbitRings({ x }: { x: number }) {
  const horizontal = useRef<THREE.Mesh>(null)
  const vertical = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const timeline = gsap.timeline({ repeat: -1, yoyo: true })
    if (horizontal.current) timeline.to(horizontal.current.rotation, { z: 0.45, duration: 18 }, 0)
    if (vertical.current) timeline.to(vertical.current.rotation, { y: 0.95, duration: 24 }, 0)
    return () => {
      timeline.kill()
    }
  }, [])

  return (
    <group position={[x, 0, -0.45]}>
      <mesh ref={horizontal} rotation={[0.9, 0.15, 0.2]}>
        <torusGeometry args={[2.25, 0.003, 4, 88]} />
        <meshBasicMaterial color="#58e2d0" transparent opacity={0.26} />
      </mesh>
      <mesh ref={vertical} rotation={[0.25, 0.65, 0.9]}>
        <torusGeometry args={[2.05, 0.002, 4, 72]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.19} />
      </mesh>
    </group>
  )
}

function EditingStudio({ onReady, visible }: { onReady: () => void; visible: boolean }) {
  const source = useLoader(FBXLoader, STUDIO_MODEL_PATH)
  const studio = useMemo(() => {
    const clone = source.clone(true)
    clone.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(clone)
    const dimensions = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const scale = 22.2 / Math.max(dimensions.x, 0.01)

    clone.scale.setScalar(scale)
    clone.position.set(-center.x * scale, -center.y * scale, -4.5 - center.z * scale)
    clone.traverse((object) => {
      if (object instanceof THREE.Light || object.name.toLowerCase() === 'bg') {
        object.visible = false
      }
      if (!(object instanceof THREE.Mesh)) return
      const makeMaterial = (material: THREE.Material) => {
        const sourceMaterial =
          material instanceof THREE.MeshPhongMaterial ||
          material instanceof THREE.MeshLambertMaterial
            ? material
            : null
        const color = sourceMaterial?.color.clone() ?? new THREE.Color('#17213a')
        if (color.getHSL({ h: 0, s: 0, l: 0 }).l < 0.025) color.set('#202d48')
        if (color.getHSL({ h: 0, s: 0, l: 0 }).l < 0.18) {
          color.lerp(new THREE.Color('#778078'), 0.28)
        }
        const emissive = sourceMaterial?.emissive.clone() ?? new THREE.Color('#000000')
        emissive.multiplyScalar(0.2)
        return new THREE.MeshStandardMaterial({
          color,
          emissive,
          emissiveIntensity: 1.2,
          map: sourceMaterial?.map ?? null,
          roughness: 0.76,
          metalness: 0.08,
          side: THREE.DoubleSide,
        })
      }
      object.material = Array.isArray(object.material)
        ? object.material.map(makeMaterial)
        : makeMaterial(object.material)
    })
    return clone
  }, [source])

  useEffect(
    () => () => {
      studio.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        if (Array.isArray(object.material))
          object.material.forEach((material) => material.dispose())
        else object.material.dispose()
      })
    },
    [studio],
  )

  useEffect(() => {
    onReady()
  }, [onReady])

  return <primitive object={studio} visible={visible} />
}

function CameraAssembly({ onPhase, onComplete }: Props) {
  const source = useLoader(FBXLoader, MODEL_PATH)
  const [colorMap, normalMap, roughnessMap, metalnessMap, opacityMap] = useLoader(
    THREE.TextureLoader,
    [...TEXTURE_PATHS],
  )
  const { camera, size } = useThree()
  const product = useRef<THREE.Group>(null)
  const guideGroup = useRef<THREE.Group>(null)
  const textures = useMemo(() => {
    const [color, normal, roughness, metalness, opacity] = [
      colorMap,
      normalMap,
      roughnessMap,
      metalnessMap,
      opacityMap,
    ].map((texture) => texture.clone())
    color.colorSpace = THREE.SRGBColorSpace
    for (const texture of [color, normal, roughness, metalness, opacity]) {
      texture.flipY = false
      texture.anisotropy = 4
      texture.needsUpdate = true
    }
    return { color, normal, roughness, metalness, opacity }
  }, [colorMap, metalnessMap, normalMap, opacityMap, roughnessMap])

  const components = useMemo(() => {
    const clone = source.clone(true)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const createMaterial = (name: string) => {
        const material = new THREE.MeshPhysicalMaterial({
          name,
          color: '#d2d0c5',
          map: textures.color,
          normalMap: textures.normal,
          roughnessMap: textures.roughness,
          metalnessMap: textures.metalness,
          alphaMap: textures.opacity,
          roughness: 0.74,
          metalness: 0.08,
          alphaTest: 0.08,
          clearcoat: 0.08,
          clearcoatRoughness: 0.52,
          side: THREE.DoubleSide,
        })
        material.normalScale.setScalar(0.28)
        return material
      }
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => createMaterial(material.name))
        : createMaterial(object.material.name)
    })

    const bounds = new THREE.Box3().setFromObject(clone)
    const extent = bounds.getSize(new THREE.Vector3()).length()
    const center = bounds.getCenter(new THREE.Vector3())
    const scale = CAMERA_MODEL_EXTENT / Math.max(extent, 0.01)

    clone.position.copy(center.multiplyScalar(-scale))
    clone.scale.setScalar(scale)
    const guide = clone.clone(true)
    const guideMaterials: THREE.MeshBasicMaterial[] = []
    guide.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const createGuideMaterial = () => {
        const material = new THREE.MeshBasicMaterial({
          color: '#a78bfa',
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          wireframe: true,
          side: THREE.DoubleSide,
        })
        guideMaterials.push(material)
        return material
      }
      object.material = Array.isArray(object.material)
        ? object.material.map(createGuideMaterial)
        : createGuideMaterial()
    })

    return {
      scene: clone,
      guide,
      guideMaterials,
      parts: clone.children.map((object, index) => ({
        object,
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        offset: explosionOffset(
          object.name || `component-${index + 1}`,
          index,
          CAMERA_MODEL_EXTENT,
        ),
      })),
    }
  }, [source, textures])

  useLayoutEffect(() => {
    if (components.parts.length === 0) {
      onPhase('fallback')
      return
    }
    const productGroup = product.current
    const guideRoot = guideGroup.current
    if (!productGroup || !guideRoot) return

    productGroup.visible = false
    productGroup.scale.setScalar(0)
    guideRoot.visible = false
    const cameraPosition = { x: 0, y: 0.12, z: size.width < 600 ? 9.4 : 7.4 }
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
    const timeline = gsap.timeline({
      onComplete,
      delay: 0.65,
      defaults: { overwrite: 'auto' },
    })

    timeline
      .set(productGroup.scale, { x: 0.08, y: 0.08, z: 0.08 }, 0)
      .set(components.guideMaterials, { opacity: 0 }, 0)
      .call(
        () => {
          productGroup.visible = true
          onPhase('opening')
        },
        [],
        0,
      )
      .to(productGroup.scale, { x: 1, y: 1, z: 1, duration: 0.95, ease: 'back.out(1.2)' }, 0.08)
      .to(
        cameraPosition,
        {
          x: size.width < 600 ? 0.12 : -0.08,
          y: 0.16,
          z: size.width < 600 ? 8.7 : 6.9,
          duration: 1.4,
          ease: 'power2.inOut',
          onUpdate: () => camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z),
        },
        0.25,
      )
      .call(() => onPhase('exploded'), [], 1.75)
      .call(
        () => {
          guideRoot.visible = true
        },
        [],
        1.75,
      )
      .to(components.guideMaterials, { opacity: 0.12, duration: 0.35, ease: 'power1.out' }, 1.75)
      .to(
        components.parts.map(({ object }) => object.position),
        {
          duration: 0.95,
          x: (index) => components.parts[index].position.x + components.parts[index].offset.x,
          y: (index) => components.parts[index].position.y + components.parts[index].offset.y,
          z: (index) => components.parts[index].position.z + components.parts[index].offset.z,
          ease: 'power2.out',
          stagger: 0.03,
        },
        1.85,
      )
      .to(
        components.parts.map(({ object }) => object.rotation),
        {
          duration: 0.95,
          x: (index) => components.parts[index].rotation.x + (index % 2 === 0 ? 0.12 : -0.12),
          y: (index) => components.parts[index].rotation.y + 0.16,
          ease: 'power2.out',
          stagger: 0.03,
        },
        1.85,
      )
      .to(productGroup.rotation, { y: -0.18, duration: 0.8, ease: 'sine.inOut' }, 1.9)
      .to(productGroup.rotation, { y: 0.08, duration: 1.1, ease: 'sine.inOut' }, 2.7)
      .call(() => onPhase('assembling'), [], 3.8)
      .to(
        components.parts.map(({ object }) => object.position),
        {
          duration: 1.6,
          x: (index) => components.parts[index].position.x,
          y: (index) => components.parts[index].position.y,
          z: (index) => components.parts[index].position.z,
          ease: 'power3.inOut',
          stagger: 0.035,
        },
        3.8,
      )
      .to(components.guideMaterials, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 5.45)
      .to(
        components.parts.map(({ object }) => object.rotation),
        {
          duration: 1.4,
          x: (index) => components.parts[index].rotation.x,
          y: (index) => components.parts[index].rotation.y,
          z: (index) => components.parts[index].rotation.z,
          ease: 'power2.inOut',
          stagger: 0.03,
        },
        3.8,
      )
      .call(() => onPhase('assembled'), [], 5.7)
      .to(productGroup.rotation, { y: 0.42, x: -0.035, duration: 0.8, ease: 'sine.inOut' }, 5.7)
      .to(
        productGroup.rotation,
        {
          y: Math.PI * 2 + 0.42,
          duration: 3.2,
          ease: 'sine.inOut',
        },
        6.5,
      )
      .to(
        cameraPosition,
        {
          z: size.width < 600 ? 6.9 : 5.5,
          duration: 0.75,
          ease: 'power2.inOut',
          onUpdate: () => camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z),
        },
        6.5,
      )
      .call(() => onPhase('camera-closeup'), [], 9.7)
      .to(
        cameraPosition,
        {
          x: size.width < 600 ? 0.85 : -0.1,
          y: -0.96,
          z: size.width < 600 ? 2 : 0.7,
          duration: 1.8,
          ease: 'power2.inOut',
          onUpdate: () => camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z),
        },
        9.7,
      )
    return () => {
      timeline.kill()
      gsap.killTweensOf(cameraPosition)
    }
  }, [camera, components, onComplete, onPhase, size.width])

  useEffect(
    () => () => {
      components.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        if (Array.isArray(object.material))
          object.material.forEach((material) => material.dispose())
        else object.material.dispose()
      })
      components.guide.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        if (Array.isArray(object.material))
          object.material.forEach((material) => material.dispose())
        else object.material.dispose()
      })
      Object.values(textures).forEach((texture) => texture.dispose())
    },
    [components, textures],
  )

  return (
    <group position={[size.width < 600 ? 0.85 : -0.1, -0.96, -0.6]}>
      <group ref={guideGroup}>
        <primitive object={components.guide} />
      </group>
      <group ref={product}>
        <primitive object={components.scene} />
      </group>
    </group>
  )
}

export function CameraScene({ onPhase, onComplete }: Props) {
  const { size } = useThree()
  const cameraOffset = size.width < 600 ? 0.85 : -0.1
  const [studioReady, setStudioReady] = useState(false)
  const [showCameraVisuals, setShowCameraVisuals] = useState(false)
  const [isCameraCloseup, setIsCameraCloseup] = useState(false)
  const onStudioReady = useCallback(() => setStudioReady(true), [])
  const handlePhase = useCallback(
    (phase: Phase) => {
      if (phase === 'camera-closeup') setIsCameraCloseup(true)
      onPhase(phase)
    },
    [onPhase],
  )

  useEffect(() => {
    useLoader.preload(FBXLoader, MODEL_PATH)
    useLoader.preload(THREE.TextureLoader, [...TEXTURE_PATHS])
  }, [])

  useEffect(() => {
    if (!studioReady) return
    onPhase('studio')
    const revealTimer = window.setTimeout(() => {
      setShowCameraVisuals(true)
      onPhase('camera-reveal')
    }, 2400)
    return () => window.clearTimeout(revealTimer)
  }, [onPhase, studioReady])

  return (
    <>
      <fog attach="fog" args={['#11172c', 15, 28]} />
      <ambientLight intensity={1.1} color="#dceaff" />
      <hemisphereLight args={['#dce7df', '#11130f', 1]} />
      <directionalLight position={[-3, 1, 5]} intensity={2} color="#d8fff7" />
      <pointLight position={[-3, 0.4, 2]} intensity={4} color="#42e4d0" distance={11} />
      <pointLight position={[3, 0.1, 1]} intensity={3.8} color="#a78bfa" distance={10} />
      <pointLight position={[-2, 1, -1.5]} intensity={6} color="#79c8ff" distance={10} />
      <pointLight position={[2, 0.6, -1.5]} intensity={5} color="#ff9078" distance={9} />
      <pointLight position={[0, 2, -3]} intensity={8} color="#d9d5ff" distance={12} />
      {!isCameraCloseup && <Dust />}
      {showCameraVisuals && !isCameraCloseup && <OrbitRings x={cameraOffset} />}
      <Suspense fallback={null}>
        <EditingStudio onReady={onStudioReady} visible={!isCameraCloseup} />
      </Suspense>
      {showCameraVisuals && (
        <Suspense fallback={null}>
          <CameraAssembly onPhase={handlePhase} onComplete={onComplete} />
        </Suspense>
      )}
    </>
  )
}
