/** Shared route matching for responsive Smriti navigation. */
export const entryRoutes=[
 '/login','/signup','/recover','/reset-password','/onboarding',
 '/accept-invite','/auth/callback','/join'
] as const;
export function isEntryRoute(path:string):boolean{
 return entryRoutes.some(route=>path===route||path.startsWith(route+'/'));
}
export function isDoctorRoute(path:string):boolean{
 return path==='/doctor'||path.startsWith('/doctor/');
}
export function showCareNavigation(path:string):boolean{
 return !isEntryRoute(path)&&!isDoctorRoute(path);
}
export function isPillarActive(path:string,pillar:string):boolean{
 return path==='/'+pillar||path.startsWith('/'+pillar+'/');
}

export function showDoctorNavigation(path:string):boolean{
 return isDoctorRoute(path);
}
export const doctorSections=[
 {href:'/doctor',label:'Patients',icon:'patients'},
 {href:'/doctor/assessments',label:'Assessments',icon:'assessments'},
 {href:'/doctor/monitoring',label:'Monitoring',icon:'monitoring'},
 {href:'/doctor/conversations',label:'Conversations',icon:'conversations'}
] as const;
export function isDoctorSectionActive(path:string,section:string):boolean{
 if(section==='/doctor')return path==='/doctor';
 if(section==='/doctor/monitoring')return path.startsWith('/doctor/monitoring')||path.startsWith('/doctor/patient/');
 return path===section||path.startsWith(section+'/');
}
