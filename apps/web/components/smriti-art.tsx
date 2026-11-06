import Image from 'next/image';

/** Supporting illustrations; canonical logo and Nani artwork remain unchanged. */
export type SmritiArtName = 'assessment-activity' | 'companionship-chat' | 'monitoring-progress' | 'recordings' | 'empty-recordings' | 'empty-assessments' | 'patient-avatar' | 'happy-feedback' | 'care-together';
export function SmritiArt({name,size=64,className=''}:{name:SmritiArtName;size?:number;className?:string}){
 return <Image src={`/illustrations/${name}.svg`} alt="" aria-hidden="true" width={size} height={size} unoptimized className={`smriti-art ${className}`.trim()}/>;
}
