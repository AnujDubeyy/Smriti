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
