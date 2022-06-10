import * as THREE      from "//unpkg.com/three@0.123.0/build/three.module.js";
import {OrbitControls} from "//unpkg.com/three@0.123.0/examples/jsm/controls/OrbitControls.js";




// https://github.com/MicMetz/endless_sea

//################################### Base ###################################//
// const gui = new dat.GUI({width: });
// Canvas
const canvas = document.querySelector("canvas.canvas");
// Scene
const scene = new THREE.Scene();



//################################### Fog ###################################//
const fog = new THREE.Fog("#000000", 0.15, 3.5);
scene.fog = fog;


//################################### Water ###################################//
//  Geometry //
const waterGeometry = new THREE.PlaneGeometry(10, 10, 510, 510);

const waterVertexShader = `
uniform float uTime;

varying float vElevation;

// Perlin 3D Noise by Stefan Gustavson
vec4 permute(vec4 x) {
    return mod(((x*34.0)+1.0)*x, 289.0);
}
vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}
vec3 fade(vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float cnoise(vec3 P) {
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
}

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.);

    // Elevation
    float elevation = (
        sin(modelPosition.x * 0.8 + uTime * 0.6) *
        sin(modelPosition.z * 1.8 + uTime * 0.6) *
        0.15
    );
    for (float i = 1.; i <= 6.; i++) {
        elevation -= abs(cnoise(vec3(modelPosition.xz * 2. * i, uTime * 0.4)) * 0.06 / i);
    }
    modelPosition.y += elevation;

    vec4 viewPosition =  viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Varyings
    vElevation = elevation;
}`;

const waterFragmentShader = `
uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

varying float vElevation;

void main() {
    float mixStrength = (vElevation + 0.05) * 8.5;
    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);
    
    gl_FragColor = vec4(color, 1.0);
    
    #ifdef USE_FOG
          #ifdef USE_LOGDEPTHBUF_EXT
              float depth = gl_FragDepthEXT / gl_FragCoord.w;
          #else
              float depth = gl_FragCoord.z / gl_FragCoord.w;
          #endif
          float fogFactor = smoothstep( fogNear, fogFar, depth );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
      #endif
}`;



//################################### Water Material ###################################//
const waterMaterial = new THREE.ShaderMaterial({
	vertexShader  : waterVertexShader,
	fragmentShader: waterFragmentShader,
	uniforms      : {
		uTime        : {value: 0},
		uDepthColor  : {value: new THREE.Color("#03325e")},
		uSurfaceColor: {value: new THREE.Color("#325bb9")},
		// uSurfaceColor: {value: new THREE.Color("#497de4")},
		fogColor     : {type: "c", value: scene.fog.color},
		fogNear      : {type: "f", value: scene.fog.near},
		fogFar       : {type: "f", value: scene.fog.far}
	},
	fog           : true
});



//################################### Water Mesh ###################################//
const water      = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI * 0.5;
scene.add(water);



//################################### Event Update ###################################//
const sizes = {
	width : window.innerWidth,
	height: window.innerHeight
};

window.addEventListener("resize", () => {
	// Update sizes
	sizes.width  = window.innerWidth;
	sizes.height = window.innerHeight;

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});



//################################### Camera ###################################//
// Base camera
const camera = new THREE.PerspectiveCamera(
	45,
	sizes.width / sizes.height,
	0.002,
	115
);
camera.position.set(1, 1, 1);
scene.add(camera);



//################################### Controls ###################################//
const controls         = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance   = 0.95;
// controls.minDistance   = 0.02;
controls.maxDistance   = 3;
// Orbit boundary: Ocean surface
controls.maxPolarAngle = Math.PI/2;


//################################### Renderer ###################################//
const renderer = new THREE.WebGLRenderer({
	canvas   : canvas,
	antialias: true
});
renderer.setSize(sizes.width + 50, sizes.height + 50);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));




//################################### Animate ###################################//
const clock = new THREE.Clock();
const tick  = () => {
	water.position.z = camera.position.z - 1.6;
	water.position.x = camera.position.x - 1.6;

	waterMaterial.uniforms.uTime.value = clock.getElapsedTime();
	// Update
	controls.update();
	// Render
	renderer.render(scene, camera);
	// Callback
	window.requestAnimationFrame(tick);
};
// Init
tick();
