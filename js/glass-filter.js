/* Liquid glass SVG filter — injected once, used by backdrop-filter: url(#lg-filter) */
(function injectGlassFilter() {
  if (document.getElementById('lg-filter')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  svg.innerHTML = `
    <defs>
      <filter id="lg-filter" x="0%" y="0%" width="100%" height="100%"
              color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.002 0.006"
                      numOctaves="1" seed="17" result="turbulence"/>
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/>
          <feFuncG type="gamma" amplitude="0" exponent="1"  offset="0"/>
          <feFuncB type="gamma" amplitude="0" exponent="1"  offset="0.5"/>
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="2" result="softMap"/>
        <feSpecularLighting in="softMap" surface-scale="4" specular-constant="0.8"
                            specular-exponent="80" lighting-color="white" result="specLight">
          <fePointLight x="-200" y="-200" z="280"/>
        </feSpecularLighting>
        <feComposite in="specLight" operator="arithmetic"
                     k1="0" k2="1" k3="1" k4="0" result="litImage"/>
        <feDisplacementMap in="SourceGraphic" in2="softMap"
                           scale="160" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>`;
  document.body.appendChild(svg);
})();
