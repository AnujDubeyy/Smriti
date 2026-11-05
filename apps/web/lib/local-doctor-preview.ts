import 'server-only';
export function localDoctorPreview(){return process.env.VERCEL!=='1'&&process.env.SMRITI_LOCAL_DOCTOR_PREVIEW==='1'&&(process.env.NODE_ENV==='development'||process.env.SMRITI_PREVIEW_PRODUCTION==='1');}
export const demoPatients=[{patient_id:'00000000-0000-4000-8000-000000000001',patient_name:'Ramesh Sharma (Demo)',caretaker_name:'Priya Sharma (Demo)',status:'joined' as const,sharing_enabled:true}];
