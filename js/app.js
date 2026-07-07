import * as THREE from "three";
import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";
import FluidSimulation from "./fluid/FluidSimulation.js";
import projects from "./data/projects.json";

const GAP_X = 48;
const GAP_Y = 100;
const COLS = 2;
const SEG = 64;
const WORLD_PER_PIXEL = 2.4;
const SCROLL_LERP = 0.055;
const RECESS_DEPTH = 2400;
const RECESS_DOWN_RATIO = 0.1;
const STACK_ROWS = 0.4;
const CAMERA_Z = 3000;
const FOLD_DEPTH = 900;
const ALPHA_FADE_NEAR = CAMERA_Z * 0.82;
const ALPHA_FADE_FAR = CAMERA_Z * 1.45;
const FOG_NEAR = CAMERA_Z * 0.75;
const FOG_FAR = CAMERA_Z * 1.28;
const CARD_SCALE = 0.78;

const CARD_OPACITY = 2.8;
const BG_COLOR = 0xf0f0ee;
const CARD_FALLBACK_COLOR = 0xe4e4e2;
const START_Y_OFFSET = -90;
// Extra scroll room at the bottom, in screen pixels (easy to tune: 0 = tight stop, 150 = more room)
const SCROLL_END_PADDING_PX = 160;

export default class Sketch {
  constructor(options) {
    this.container = options.dom;
    this.scrollSpacer = options.scrollSpacer;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.sortObjects = true;
    this.container.appendChild(this.renderer.domElement);

    this.fluid = new FluidSimulation(this.renderer, this.renderer.domElement, BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(36, this.width / this.height, 1, 10000);
    this.camera.position.set(0, 0, CAMERA_Z);
    this.camera.lookAt(0, 0, 0);

    this.clock = new THREE.Clock();
    this.materials = [];
    this.cards = [];
    this.isPlaying = true;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.placeholderTexture = new THREE.DataTexture(
      new Uint8Array([228, 228, 226, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    this.placeholderTexture.colorSpace = THREE.SRGBColorSpace;
    this.placeholderTexture.needsUpdate = true;

    this.textureLoader = new THREE.TextureLoader();

    this.targetScrollY = 0;
    this.currentScrollY = 0;
    this.maxScrollPx = 0;
    this.foldLine = { start: 0, end: 0 };
    this.cardSize = 1000;
    this.baseYOffset = 0;

    this.contentGroup = new THREE.Group();
    this.scene.add(this.contentGroup);

    this.addCards();
    this.updateContentOffset();
    this.updateFoldLine();
    this.setupScroll();
    this.setupCardClicks();
    this.resize();
    this.render();
    this.setupResize();
  }

  getRowCount() {
    return Math.ceil(projects.length / COLS);
  }

  getVisibleHeight() {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    return 2 * Math.tan(vFov * 0.5) * this.camera.position.z;
  }

  getVisibleWidth() {
    return this.getVisibleHeight() * this.camera.aspect;
  }

  getCardSize() {
    const visibleW = this.getVisibleWidth();
    return ((visibleW * 0.96 - GAP_X) / COLS) * CARD_SCALE;
  }

  getMaxScrollWorld(cardSize) {
    const rows = this.getRowCount();
    const rowStep = cardSize + GAP_Y;
    const totalHeight = (rows - 1) * rowStep + cardSize;
    const visibleHeight = this.getVisibleHeight();
    return Math.max(0, totalHeight - visibleHeight + START_Y_OFFSET);
  }

  updateScrollSpacer(cardSize) {
    const maxScrollWorld = this.getMaxScrollWorld(cardSize);
    const maxScrollPx = maxScrollWorld / WORLD_PER_PIXEL + SCROLL_END_PADDING_PX;
    this.maxScrollPx = maxScrollPx;
    this.scrollSpacer.style.height = `${maxScrollPx + window.innerHeight}px`;

    if (window.scrollY > maxScrollPx) {
      window.scrollTo(0, maxScrollPx);
      this.targetScrollY = maxScrollWorld;
    }
  }

  updateContentOffset() {
    this.baseYOffset = START_Y_OFFSET;
  }

  getCardY(row) {
    const rowStep = this.cardSize + GAP_Y;
    return -row * rowStep;
  }

  updateFoldLine() {
    const foldRange = 200;
    const firstRowTop = this.cardSize * 0.5;
    const restMargin = 80;
    const foldCenter = firstRowTop + restMargin + foldRange * 0.68;

    this.foldLine.start = foldCenter - foldRange;
    this.foldLine.end = foldCenter + foldRange;
  }

  updateStackUniforms() {
    const stackHeight = (this.cardSize + GAP_Y) * STACK_ROWS;
    this.materials.forEach((material) => {
      material.uniforms.u_stackFadeHeight.value = stackHeight;
      material.uniforms.u_recessDownRatio.value = RECESS_DOWN_RATIO;
      material.uniforms.u_foldDepth.value = FOLD_DEPTH;
    });
  }

  updateDepthUniforms() {
    this.materials.forEach((material) => {
      material.uniforms.u_alphaFadeNear.value = ALPHA_FADE_NEAR;
      material.uniforms.u_alphaFadeFar.value = ALPHA_FADE_FAR;
      material.uniforms.u_fogNear.value = FOG_NEAR;
      material.uniforms.u_fogFar.value = FOG_FAR;
    });
  }

  updateWaveUniforms() {
    this.materials.forEach((material) => {
      material.uniforms.u_waveY.value = 4.8 / this.cardSize;
      material.uniforms.u_waveX.value = 5.4 / this.cardSize;
      material.uniforms.u_zScale.value = this.cardSize / 1.2;
    });
  }

  createMaterial(imageAspect = 1.9) {
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        u_time: { value: 0 },
        u_waveY: { value: 4.8 / this.cardSize },
        u_waveX: { value: 5.4 / this.cardSize },
        u_zScale: { value: this.cardSize / 1.2 },
        u_bendPoint: {
          value: new THREE.Vector2(this.foldLine.start, this.foldLine.end),
        },
        u_foldDepth: { value: FOLD_DEPTH },
        u_recessDepth: { value: RECESS_DEPTH },
        u_recessDownRatio: { value: RECESS_DOWN_RATIO },
        u_stackFadeHeight: { value: (this.cardSize + GAP_Y) * STACK_ROWS },
        u_alphaFadeNear: { value: ALPHA_FADE_NEAR },
        u_alphaFadeFar: { value: ALPHA_FADE_FAR },
        u_fogNear: { value: FOG_NEAR },
        u_fogFar: { value: FOG_FAR },
        u_opacity: { value: CARD_OPACITY },
        u_texture: { value: this.placeholderTexture },
        u_hasTexture: { value: 0.0 },
        u_imageAspect: { value: imageAspect },
        u_color: { value: new THREE.Color(CARD_FALLBACK_COLOR) },
        u_bgColor: { value: new THREE.Color(BG_COLOR) },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
    });
    this.materials.push(material);
    return material;
  }

  loadCardTexture(image, material) {
    const url = this.resolveImageUrl(image);

    this.textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.uniforms.u_texture.value = texture;
        material.uniforms.u_hasTexture.value = 1.0;
      },
      undefined,
      (error) => {
        console.warn(
          `Failed to load project image: ${url}\n` +
            `Put the file at: assets/projects/${image} (relative to project root)`,
          error
        );
      }
    );
  }

resolveImageUrl(image) {
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  const basePath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/app")
      ? "/app"
      : "";

  if (image.startsWith("assets/") || image.startsWith("./")) {
    return image.startsWith("./") ? image : `${basePath}/${image}`;
  }

  return `${basePath}/assets/projects/${image}`;
}

  
  addCards() {
    this.cardSize = this.getCardSize();
    const colX = [
      -(this.cardSize + GAP_X) * 0.5,
      (this.cardSize + GAP_X) * 0.5,
    ];

    projects.forEach((project, index) => {
      const row = Math.floor(index / COLS);
      const col = index % COLS;

      const geometry = new THREE.PlaneGeometry(this.cardSize, this.cardSize, SEG, SEG);
      const material = this.createMaterial(project.aspect || 1.9);
      const card = new THREE.Mesh(geometry, material);

      card.position.set(colX[col], this.getCardY(row), 0);
      card.userData = {
        title: project.title,
        description: project.description,
        link: project.link,
      };

      this.contentGroup.add(card);
      this.cards.push(card);

      if (project.image) {
        this.loadCardTexture(project.image, material);
      }
    });

    this.updateScrollSpacer(this.cardSize);
    this.updateWaveUniforms();
    this.updateStackUniforms();
    this.updateDepthUniforms();
  }

  layoutCards() {
    const newSize = this.getCardSize();
    if (Math.abs(newSize - this.cardSize) < 2) return;

    this.cardSize = newSize;
    const colX = [
      -(this.cardSize + GAP_X) * 0.5,
      (this.cardSize + GAP_X) * 0.5,
    ];
    const baseSize = this.cards[0].geometry.parameters.width;

    this.cards.forEach((card, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const scale = this.cardSize / baseSize;
      card.scale.set(scale, scale, 1);
      card.position.x = colX[col];
      card.position.y = this.getCardY(row);
    });

    this.updateScrollSpacer(this.cardSize);
    this.updateWaveUniforms();
    this.updateStackUniforms();
    this.updateDepthUniforms();
  }

  setupResize() {
    this.handleResize = this.resize.bind(this);
    window.addEventListener("resize", this.handleResize);
  }

  setupScroll() {
    this.handleScroll = () => {
      const scrollY = Math.min(window.scrollY, this.maxScrollPx);
      this.targetScrollY = scrollY * WORLD_PER_PIXEL;
    };
    window.addEventListener(
      "scroll",
      this.handleScroll,
      { passive: true }
    );
  }

  setupCardClicks() {
    this.handleCardClick = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.cards);

      const link = hits[0]?.object.userData.link;
      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
      }
    };

    this.renderer.domElement.addEventListener("click", this.handleCardClick);
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.updateContentOffset();
    this.updateFoldLine();
    this.layoutCards();
  }

  updateUniforms(time) {
    const diff = this.targetScrollY - this.currentScrollY;
    this.currentScrollY += diff * SCROLL_LERP;
    this.contentGroup.position.y = this.baseYOffset + this.currentScrollY;

    this.fluid.update();

    this.materials.forEach((material) => {
      material.uniforms.u_time.value = time;
      material.uniforms.u_bendPoint.value.set(this.foldLine.start, this.foldLine.end);
    });
  }

  render() {
    if (!this.isPlaying) return;

    this.updateUniforms(this.clock.getElapsedTime());

    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.fluid.renderOverlay();
  }

  destroy() {
    this.isPlaying = false;
    if (this.handleResize) window.removeEventListener("resize", this.handleResize);
    if (this.handleScroll) window.removeEventListener("scroll", this.handleScroll);
    if (this.handleCardClick) {
      this.renderer.domElement.removeEventListener("click", this.handleCardClick);
    }
    this.fluid?.destroy?.();
    this.materials.forEach((material) => material.dispose());
    this.cards.forEach((card) => card.geometry.dispose());
    this.placeholderTexture.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
