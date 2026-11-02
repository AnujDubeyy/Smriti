import Image from 'next/image';
import type { Pillar } from '../lib/messages';
export function BrandLogo({ alt }: { alt: string }) { return <Image src="/brand/logo.webp" alt={alt} width={196} height={83} className="brand-logo" priority unoptimized />; }
export function Mascot({ pillar, large = false }: { pillar: Pillar; large?: boolean }) { return <Image src={`/brand/${pillar}.webp`} alt="" width={large ? 160 : 64} height={large ? 160 : 64} className={large ? 'mascot mascot-large' : 'mascot'} unoptimized />; }
