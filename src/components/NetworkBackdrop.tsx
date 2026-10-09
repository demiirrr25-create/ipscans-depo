export function NetworkBackdrop() {
  const nodes = [[700,180],[960,90],[1170,230],[860,340],[1080,480],[680,550],[1240,630],[930,710]];
  const paths = ['M700 180L960 90L1170 230L860 340L700 180','M860 340L1080 480L1240 630L930 710L680 550L860 340','M960 90L1080 480L680 550','M1170 230L1240 630L860 340'];
  return <div className="network-backdrop pointer-events-none absolute inset-0" aria-hidden="true">
    <svg viewBox="0 0 1440 850" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs><radialGradient id="ambient-network"><stop stopColor="#fff" stopOpacity=".09"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></radialGradient></defs>
      <circle cx="1030" cy="400" r="540" fill="url(#ambient-network)"/>
      <g fill="none" stroke="white" strokeWidth="1">
        {paths.map((d,i)=><g key={d}><path d={d} opacity=".12"/><path d={d} className="network-packet" style={{animationDelay:`-${i*4}s`}}/></g>)}
        {[180,290,400].map((r,i)=><circle key={r} cx="960" cy="400" r={r} className="network-orbit" style={{animationDelay:`-${i*3}s`}}/>) }
      </g>
      {nodes.map(([x,y],i)=><g key={x} transform={`translate(${x} ${y})`}><circle r="5" fill="#ddd"/><circle r="17" fill="none" stroke="white" className="network-beacon" style={{animationDelay:`-${i}s`}}/><text x="22" y="4" fill="#888" fontSize="10" fontFamily="monospace">{`NODE / ${String(i+1).padStart(2,'0')}`}</text></g>)}
    </svg>
  </div>;
}
