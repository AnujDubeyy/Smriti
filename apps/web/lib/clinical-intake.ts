import {z} from 'zod';
/** Structured fictional clinical intake. No screening score or diagnosis is inferred. */
export const relationshipOptions=[
 ['daughter','Daughter'],['son','Son'],['wife','Wife'],['husband','Husband'],
 ['father','Father'],['mother','Mother'],['uncle','Uncle'],['aunt','Aunty'],
 ['brother','Brother'],['sister','Sister'],['no_blood_relation','No blood relation'],['other','Other']
] as const;
export const diagnosisOptions=[
 ['alzheimers','Alzheimer’s disease (AD)'],['parkinsons','Parkinson’s disease (PD)'],
 ['parkinsons_dementia','Parkinson’s disease dementia (PDD)'],
 ['lewy_body_dementia','Dementia with Lewy bodies (DLB)'],
 ['vascular_dementia','Vascular dementia'],['frontotemporal_dementia','Frontotemporal dementia'],
 ['mci','Mild cognitive impairment (MCI)'],['other','Other condition'],
 ['under_evaluation','Under evaluation / not diagnosed']
] as const;
export const dementiaDiagnoses=['alzheimers','parkinsons_dementia','lewy_body_dementia','vascular_dementia','frontotemporal_dementia'] as const;
export const bloodGroups=['unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'] as const;
export const severityOptions=[
 ['not_assessed','Not assessed / unknown'],['mild','Mild dementia'],['moderate','Moderate dementia'],['severe','Severe dementia']
] as const;
export const supportOptions=[
 ['independent','Independent in daily activities'],
 ['occasional','Some help with complex tasks'],
 ['daily','Needs help with daily activities'],
 ['full','Needs extensive personal care'],
 ['unknown','Not assessed']
] as const;
export const communicationOptions=[
 ['short_sentences','Use short, simple sentences'],
 ['slower_pace','Speak slowly and allow extra response time'],
 ['repeat_gently','Repeat calmly if requested'],
 ['hearing_support','Hearing support / clearer speech'],
 ['movement_support','Allow additional time for motor or speech difficulties'],
 ['calm_topics','Avoid upsetting or demanding topics']
] as const;
const relation=z.enum(relationshipOptions.map(x=>x[0]) as [string,...string[]]);
const diagnosis=z.enum(diagnosisOptions.map(x=>x[0]) as [string,...string[]]);
const severity=z.enum(severityOptions.map(x=>x[0]) as [string,...string[]]);
const support=z.enum(supportOptions.map(x=>x[0]) as [string,...string[]]);
const communication=z.enum(communicationOptions.map(x=>x[0]) as [string,...string[]]);
export const clinicalFields=z.object({
 blood_group:z.enum(bloodGroups).default('unknown'),
 diagnoses:z.array(diagnosis).min(1).max(5),
 diagnosis_status:z.enum(['confirmed_by_clinician','under_evaluation','unknown']).default('under_evaluation'),
 dementia_stage:severity.default('not_assessed'),
 daily_support:support.default('unknown'),
 communication_support:z.array(communication).max(6).default([]),
 other_condition:z.string().trim().max(150).default(''),
});
export const intakeSchema=z.object({
 patient_name:z.string().trim().min(2).max(120),
 caretaker_name:z.string().trim().min(2).max(120),
 relationship:relation,
 relationship_other:z.string().trim().max(100).default(''),
 date_of_birth:z.iso.date(),
 sex:z.enum(['female','male','intersex','prefer_not_to_say']),
 family_count:z.number().int().min(0).max(50),
 locale:z.enum(['en-IN','hi-IN','mr-IN']),
 ...clinicalFields.shape
}).strict().superRefine((value,ctx)=>{
 if(value.relationship==='other'&&!value.relationship_other)
  ctx.addIssue({code:'custom',path:['relationship_other'],message:'Specify the relationship'});
 if(value.diagnoses.includes('under_evaluation')&&value.diagnoses.length>1)
  ctx.addIssue({code:'custom',path:['diagnoses'],message:'Use under evaluation by itself'});
 if(value.diagnoses.includes('other')&&!value.other_condition)
  ctx.addIssue({code:'custom',path:['other_condition'],message:'Specify the condition'});
 const dementia=value.diagnoses.some(x=>(dementiaDiagnoses as readonly string[]).includes(x));
 if(!dementia&&value.dementia_stage!=='not_assessed')
  ctx.addIssue({code:'custom',path:['dementia_stage'],message:'Stage requires a documented dementia diagnosis'});
 if(value.diagnosis_status!=='confirmed_by_clinician'&&value.dementia_stage!=='not_assessed')
  ctx.addIssue({code:'custom',path:['dementia_stage'],message:'Do not assign a dementia stage to an unconfirmed condition'});
});
export type DoctorIntake=z.input<typeof intakeSchema>;

/**
 * Map previously saved human-readable relationships to stable option IDs.
 * Keep genuinely custom relationships under Other, without erasing their text.
 */
export function normalizeCaregiverRelationship(
 relationship:unknown,
 relationshipOther:unknown
):{relationship:string;relationship_other:string}{
 const original=typeof relationship==='string'?relationship.trim():'';
 const detail=typeof relationshipOther==='string'?relationshipOther.trim():'';
 const map:Record<string,string>={
  auntie:'aunt',aunty:'aunt',aunt:'aunt',
  'no blood relation':'no_blood_relation',
  'no blood relationship':'no_blood_relation',
  'non blood relation':'no_blood_relation',
  'not related':'no_blood_relation',
  'no relation':'no_blood_relation'
 };
 function known(value:string):string|undefined{
  const key=value.toLocaleLowerCase('en').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
  const direct=relationshipOptions.find(([id,label])=>
   id.replace(/_/g,' ')===key||label.toLocaleLowerCase('en')===key);
  return direct?.[0]??map[key];
 }
 const primary=known(original);
 if(primary&&primary!=='other')return {relationship:primary,relationship_other:''};
 const legacyDetail=known(detail);
 if(primary==='other'&&legacyDetail&&legacyDetail!=='other')
  return {relationship:legacyDetail,relationship_other:''};
 const freeText=primary==='other'?detail:(detail||original);
 return {relationship:'other',relationship_other:freeText};
}
