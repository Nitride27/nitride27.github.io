gsap.registerPlugin(ScrollTrigger,ScrollToPlugin);

const panels = gsap.utils.toArray(".panel");



gsap.to(panels, {
  xPercent: -100 * (panels.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".container",
    pin: true,
    scrub: 1,
    snap: 1 / (panels.length - 1),
    end: () => "+=" + document.querySelector(".container").offsetWidth
  }
});
let lastProgress = 0;
let scrollVelocity = 0;

sectionPlanets.forEach(planet => {
  planet.userData.targetZ = planet.position.z;
  planet.userData.targetScale = planet.scale.x;
  planet.userData.targetOpacity = 1;
});

// RUN ON PAGE LOAD
function initPlanetPositions() {
    const p = 0; // start of scroll
    const index = p * (sectionPlanets.length - 1);

    ship.position.x = -4;
    ship.position.z = -2 - p * 8;
    ship.rotation.set(
        Math.sin(p * Math.PI) * 0.03, // pitch
        0,                           // yaw locked
        0                            // roll locked
    );

    sectionPlanets.forEach((planet, i) => {
        const offset = i - index * 0.9; // 0 = current planet

        // =====================
        // Z AXIS ONLY (FRONT / BACK)
        // =====================

        if (offset < 0) {
            // PAST PLANETS → go behind the ship
            planet.position.z = ship.position.z * 0.8 + Math.abs(offset) * 75;
        }
            // else if (offset === 0) {
            //   planet.position.z = ship.position.z*0.5 -offset*10-15;
        //}
        else {
            // CURRENT + FUTURE PLANETS → in front of ship
            planet.position.z = ship.position.z * 0.8 - offset * 10 - 20;
        }

        // Lock X & Y (no left/right motion)
        planet.position.x = 1;
        planet.position.y = -1;

        // =====================
        // SCALE (DEPTH FEEL)
        // =====================
        const distance = Math.abs(offset) * 0.9;
        const scale = THREE.MathUtils.clamp(
            1.5 - distance * 0.8,
            0.4,
            1.5
        );
        planet.scale.setScalar(scale);

        // =====================
        // FADE
        // =====================
        planet.material.transparent = true;

        if (offset < 1000) {
            // Past planets fade out as they go behind
            planet.material.opacity = THREE.MathUtils.clamp(
                1 - distance * 0.35,
                0,
                1
            );
        }
            //else if(offset===10){
            // planet.material.opacity = THREE.MathUtils.clamp(
            //   1 - distance * 0.35,
            //  0,
            //  1
            //);
        // }
        else {
            // Current + future planets
            planet.material.opacity = THREE.MathUtils.clamp(
                1 - distance * 0.25,
                0.25,
                1
            );
        }
    });
}
// call once
initPlanetPositions();

// Scroll affects ship position
ScrollTrigger.create({
  start: 100,
  end: "max",
  onUpdate: self => {
    const p = self.progress;
    const index = p * (sectionPlanets.length - 1);

const container = document.querySelector(".container");
const totalScroll =
  container.offsetWidth - window.innerWidth;

document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();

    const section = link.dataset.section;
    const index = sectionIndexMap[section];

    if (index === undefined) return;

    const progress = index / (sectionIds.length - 1);
    const scrollY = ScrollTrigger.maxScroll(window) * progress;

    gsap.to(window, {
      scrollTo: scrollY,
      duration: 1.2,
      ease: "power2.inOut"
    });
  });
});
ship.position.x = -6;
ship.position.z = -2 - p * 8;
ship.rotation.set(
  Math.sin(p * Math.PI) * 0.03, // pitch
  0,                           // yaw locked
  0                            // roll locked
);



    // scroll velocity
    const Scrollvelocity = Math.abs(p - lastProgress) * 500;
    lastProgress = p;

    const thrust = Math.min(Scrollvelocity, 1);

    // engine glow
    engineGlows.forEach(glow => {
      glow.scale.setScalar(1 + thrust * 2.2);
      glow.material.emissiveIntensity = 1.2 + thrust * 4;
    });

    // exhaust stretch
   engineExhausts.forEach(exhaust => {
    exhaust.material.opacity = thrust;        // visible proportional to scroll speed
    exhaust.scale.z = 1 + thrust * 2.5;      // elongate with thrust
});

    // speed lines
    speedLines.material.opacity = thrust;

    // camera effects
    cameraTargetX = ship.position.x * 0.4;
    cameraShake = thrust * 0.2;

sectionPlanets.forEach((planet, i) => {
  const offset = i - index* 0.9; // 0 = current planet

  // =====================
  // Z AXIS ONLY (FRONT / BACK)
  // =====================

  if (offset < 0) {
    // PAST PLANETS → go behind the ship
    planet.position.z = ship.position.z*0.8 + Math.abs(offset) * 75 ;
  }
 // else if (offset === 0) {
   //   planet.position.z = ship.position.z*0.5 -offset*10-15;
  //}
  else {
    // CURRENT + FUTURE PLANETS → in front of ship
    planet.position.z = ship.position.z*0.8 - offset * 10 - 20;
  }

  // Lock X & Y (no left/right motion)
  planet.position.x = -1;
  planet.position.y = -1;

  // =====================
  // SCALE (DEPTH FEEL)
  // =====================
  const distance = Math.abs(offset)*0.9;
  const scale = THREE.MathUtils.clamp(
    1.5 - distance * 0.8,
    0.4,
    1.5
  );
  planet.scale.setScalar(scale);

  // =====================
  // FADE
  // =====================
  planet.material.transparent = true;

  if (offset < 1000) {
      // Past planets fade out as they go behind
      planet.material.opacity = THREE.MathUtils.clamp(
          1 - distance * 0.35,
          0,
          1
      );
  }
  //else if(offset===10){
    // planet.material.opacity = THREE.MathUtils.clamp(
     //   1 - distance * 0.35,
       //  0,
        //  1
      //);
 // }
  else {
    // Current + future planets
    planet.material.opacity = THREE.MathUtils.clamp(
      1 - distance * 0.25,
      0.25,
      1
    );
  }
});
  }
});

